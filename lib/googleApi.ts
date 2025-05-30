// Helper functions for Google Sheets and Drive API interactions

/**
 * ENCAPSULAMIENTO DE ACCESO A DATOS
 * Todas las funciones de este archivo representan puntos de integración para un backend futuro.
 * Para migrar a un backend propio, basta con reemplazar la lógica interna de cada función por llamadas a endpoints REST/GraphQL equivalentes.
 */

const SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";
const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3/files";
const SPREADSHEET_NAME = "Cashé Finance Data";
const FOLDER_NAME = "Cashé";

interface SheetValueRange {
  range: string;
  majorDimension: string;
  values: string[][];
}

/**
 * Busca la carpeta 'Cashé' en Google Drive o la crea si no existe.
 * @param accessToken Token OAuth de Google
 * @returns ID de la carpeta
 *
 * BACKEND FUTURO: Reemplazar por un endpoint que devuelva o cree la carpeta de usuario.
 */
export async function findOrCreateFolder(accessToken: string): Promise<string> {
  if (!accessToken) {
    console.error("No access token provided to findOrCreateFolder");
    throw new Error("Access token is required");
  }

  // First try to find the folder
  const query = encodeURIComponent(
    `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );
  const url = `${DRIVE_API_BASE}?q=${query}&fields=files(id,name)`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "Error finding folder:",
        response.status,
        response.statusText
      );
      throw new Error(
        `Failed to search for folder: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = await response.json();
    console.log("Drive folder search response:", data);

    // If folder exists, return its ID
    if (data.files && data.files.length > 0) {
      console.log(`Found folder: ${data.files[0].name} (${data.files[0].id})`);
      return data.files[0].id;
    }

    // If not found, create it
    console.log(`Folder '${FOLDER_NAME}' not found. Creating...`);

    const createResponse = await fetch(`${DRIVE_API_BASE}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: FOLDER_NAME,
        mimeType: "application/vnd.google-apps.folder",
      }),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error(
        "Error creating folder:",
        createResponse.status,
        createResponse.statusText
      );
      throw new Error(
        `Failed to create folder: ${createResponse.status} ${createResponse.statusText} - ${errorText}`
      );
    }

    const folderData = await createResponse.json();
    console.log(`Created folder '${FOLDER_NAME}' with ID: ${folderData.id}`);
    return folderData.id;
  } catch (error) {
    console.error("Error in findOrCreateFolder:", error);
    throw error;
  }
}

/**
 * Mueve un archivo a una carpeta específica en Google Drive.
 * @param accessToken Token OAuth de Google
 * @param fileId ID del archivo a mover
 * @param folderId ID de la carpeta destino
 *
 * BACKEND FUTURO: Reemplazar por un endpoint que mueva archivos entre carpetas del usuario.
 */
export async function moveFileToFolder(
  accessToken: string,
  fileId: string,
  folderId: string
): Promise<void> {
  if (!accessToken || !fileId || !folderId) {
    console.error("Missing required parameters for moveFileToFolder");
    throw new Error("Access token, file ID, and folder ID are all required");
  }

  // First, get the current parent folders
  const getFileResponse = await fetch(
    `${DRIVE_API_BASE}/${fileId}?fields=parents`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!getFileResponse.ok) {
    const errorText = await getFileResponse.text();
    throw new Error(
      `Failed to get file parents: ${getFileResponse.status} ${getFileResponse.statusText} - ${errorText}`
    );
  }

  const fileData = await getFileResponse.json();
  const currentParents = fileData.parents.join(",");

  // Now move the file (add to new folder, remove from old folders)
  const updateUrl = `${DRIVE_API_BASE}/${fileId}?addParents=${folderId}&removeParents=${currentParents}`;

  const moveResponse = await fetch(updateUrl, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!moveResponse.ok) {
    const errorText = await moveResponse.text();
    throw new Error(
      `Failed to move file to folder: ${moveResponse.status} ${moveResponse.statusText} - ${errorText}`
    );
  }

  console.log(`Successfully moved file ${fileId} to folder ${folderId}`);
}

/**
 * Busca la hoja de cálculo principal 'Cashé Finance Data' en Google Drive.
 * @param accessToken Token OAuth de Google
 * @returns ID de la hoja si existe, o null
 *
 * BACKEND FUTURO: Reemplazar por un endpoint que devuelva la hoja/carpeta de datos del usuario.
 */
export async function findSheet(accessToken: string): Promise<string | null> {
  if (!accessToken) {
    console.error("No access token provided to findSheet");
    throw new Error("Access token is required");
  }

  const query = encodeURIComponent(
    `name='${SPREADSHEET_NAME}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`
  );
  const url = `${DRIVE_API_BASE}?q=${query}&fields=files(id,name)`;

  console.log(
    "Searching for spreadsheet with query:",
    decodeURIComponent(query)
  );

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "Error finding sheet:",
        response.status,
        response.statusText
      );
      console.error("Response body:", errorText);

      // Handle specific errors like 401 Unauthorized (token expired?)
      if (response.status === 401) {
        throw new Error(
          "Unauthorized: Your session has expired. Please sign in again."
        );
      }

      throw new Error(
        `Failed to search for spreadsheet: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = await response.json();
    console.log("Drive search response:", data);

    if (data.files && data.files.length > 0) {
      console.log(
        `Found spreadsheet: ${data.files[0].name} (${data.files[0].id})`
      );
      return data.files[0].id; // Return the ID of the first found sheet
    }

    console.log("No matching spreadsheet found. Will need to create one.");
    return null; // Not found
  } catch (error) {
    console.error("Error executing findSheet:", error);
    throw error; // Re-throw the error for the caller to handle
  }
}

/**
 * Crea la hoja de cálculo principal 'Cashé Finance Data' en Google Drive.
 * @param accessToken Token OAuth de Google
 * @returns ID de la hoja creada
 *
 * BACKEND FUTURO: Reemplazar por un endpoint que cree la hoja/carpeta de datos del usuario.
 */
export async function createSheet(accessToken: string): Promise<string> {
  if (!accessToken) {
    console.error("No access token provided to createSheet");
    throw new Error("Access token is required");
  }

  const url = SHEETS_API_BASE;
  console.log("Creating new spreadsheet:", SPREADSHEET_NAME);

  // Create a new spreadsheet with initial sheets
  const body = {
    properties: {
      title: SPREADSHEET_NAME,
    },
    sheets: [
      {
        properties: {
          title: "Transactions",
          gridProperties: {
            rowCount: 1000,
            columnCount: 10,
          },
        },
      },
      {
        properties: {
          title: "Accounts",
          gridProperties: {
            rowCount: 100,
            columnCount: 8,
          },
        },
      },
      {
        properties: {
          title: "Categories",
          gridProperties: {
            rowCount: 50,
            columnCount: 5,
          },
        },
      },
      {
        properties: {
          title: "Budgets",
          gridProperties: {
            rowCount: 100,
            columnCount: 5,
          },
        },
      },
      {
        properties: {
          title: "Summary",
          gridProperties: {
            rowCount: 20,
            columnCount: 5,
          },
        },
      },
    ],
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "Error creating sheet:",
        response.status,
        response.statusText
      );
      console.error("Response body:", errorText);

      if (response.status === 401) {
        throw new Error(
          "Unauthorized: Your session has expired. Please sign in again."
        );
      }

      throw new Error(
        `Failed to create spreadsheet: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = await response.json();
    console.log("Spreadsheet created successfully:", data.spreadsheetId);

    // Initialize the sheets with headers
    await initializeSheetHeaders(accessToken, data.spreadsheetId);

    // Move spreadsheet to Cashé folder
    try {
      const folderId = await findOrCreateFolder(accessToken);
      await moveFileToFolder(accessToken, data.spreadsheetId, folderId);
      console.log(`Spreadsheet moved to Cashé folder successfully`);
    } catch (folderError) {
      console.error("Error moving spreadsheet to folder:", folderError);
      // Continue even if moving to folder fails
      // We still have a valid spreadsheet, just not in the desired folder
    }

    return data.spreadsheetId;
  } catch (error) {
    console.error("Error executing createSheet:", error);
    throw error;
  }
}

/**
 * Lee datos de un rango de una hoja de cálculo.
 * @param accessToken Token OAuth de Google
 * @param spreadsheetId ID de la hoja
 * @param range Rango A1 (ej: 'Accounts!A2:H')
 * @returns Objeto con los valores leídos
 *
 * BACKEND FUTURO: Reemplazar por un endpoint GET que devuelva los datos solicitados.
 */
export async function getSheetData(
  accessToken: string,
  spreadsheetId: string,
  range: string
): Promise<any> {
  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.text();

      // Check if the error is related to a missing sheet
      if (errorData.includes("Unable to parse range")) {
        console.log("Sheet might not exist, trying to create it");

        // Extract sheet name from range (e.g., "Summary" from "Summary!A2:B5")
        const sheetName = range.split("!")[0];

        // Create the missing sheet
        await createMissingSheet(accessToken, spreadsheetId, sheetName);

        // If it's specifically the Summary sheet, initialize it with proper structure
        if (sheetName === "Summary") {
          await initializeSummarySheet(accessToken, spreadsheetId);

          // Now try to get the data again
          return await getSheetData(accessToken, spreadsheetId, range);
        } else {
          // For other sheets, initialize them with appropriate headers
          await initializeMissingSheetHeaders(
            accessToken,
            spreadsheetId,
            sheetName
          );
          // Then try to get the data again
          return await getSheetData(accessToken, spreadsheetId, range);
        }
      }

      throw new Error(
        `Error getting sheet data: ${response.statusText} ${JSON.stringify(
          errorData
        )}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error in getSheetData:", error);
    throw error;
  }
}

/**
 * Agrega filas a una hoja de cálculo.
 * @param accessToken Token OAuth de Google
 * @param spreadsheetId ID de la hoja
 * @param range Rango A1 donde agregar (ej: 'Accounts!A2:H')
 * @param values Matriz de valores a agregar
 * @returns Respuesta de la API
 *
 * BACKEND FUTURO: Reemplazar por un endpoint POST para crear nuevos registros.
 */
export async function appendSheetData(
  accessToken: string,
  spreadsheetId: string,
  range: string,
  values: any[][]
): Promise<any> {
  const url = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(
    range
  )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const body = {
    range: range, // Although appending, Sheets API often uses the range to determine the table
    majorDimension: "ROWS",
    values: values,
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error(
        "Error appending sheet data:",
        response.statusText,
        await response.text()
      );
      throw new Error(`Failed to append sheet data: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Data appended successfully:", data);
    return data;
  } catch (error) {
    console.error("Error executing appendSheetData:", error);
    throw error;
  }
}

/**
 * Actualiza filas en una hoja de cálculo.
 * @param accessToken Token OAuth de Google
 * @param spreadsheetId ID de la hoja
 * @param range Rango A1 a actualizar (ej: 'Accounts!A2:H2')
 * @param values Matriz de valores a actualizar
 * @returns Respuesta de la API
 *
 * BACKEND FUTURO: Reemplazar por un endpoint PUT/PATCH para actualizar registros.
 */
export async function updateSheetData(
  accessToken: string,
  spreadsheetId: string,
  range: string,
  values: any[][]
): Promise<any> {
  const url = `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(
    range
  )}?valueInputOption=USER_ENTERED`;

  const body = {
    range: range,
    majorDimension: "ROWS",
    values: values,
  };

  try {
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error(
        "Error updating sheet data:",
        response.statusText,
        await response.text()
      );
      throw new Error(`Failed to update sheet data: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Data updated successfully:", data);
    return data;
  } catch (error) {
    console.error("Error executing updateSheetData:", error);
    throw error;
  }
}

/**
 * Initializes the sheets with headers.
 * @param accessToken Google OAuth Access Token
 * @param spreadsheetId The ID of the spreadsheet.
 */
async function initializeSheetHeaders(
  accessToken: string,
  spreadsheetId: string
): Promise<void> {
  try {
    // Initialize Transactions sheet
    const transactionHeaders = [
      [
        "Date",
        "Type",
        "Description",
        "Category",
        "Amount",
        "Account",
        "Tags",
        "Recurring",
        "Notes",
        "ID",
      ],
    ];
    await updateSheetData(
      accessToken,
      spreadsheetId,
      "Transactions!A1:J1",
      transactionHeaders
    );

    // Initialize Accounts sheet
    const accountHeaders = [
      [
        "Name",
        "Type",
        "Initial Balance",
        "Current Balance",
        "Currency",
        "Notes",
        "Last Updated",
        "ID",
      ],
    ];
    await updateSheetData(
      accessToken,
      spreadsheetId,
      "Accounts!A1:H1",
      accountHeaders
    );

    // Initialize Categories sheet
    const categoryHeaders = [
      ["Name", "Type", "Parent Category", "Budget", "ID"],
    ];
    await updateSheetData(
      accessToken,
      spreadsheetId,
      "Categories!A1:E1",
      categoryHeaders
    );

    // Initialize Budgets sheet
    const budgetHeaders = [
      ["Category", "Monthly Limit", "Start Date", "End Date", "Notes"],
    ];
    await updateSheetData(
      accessToken,
      spreadsheetId,
      "Budgets!A1:E1",
      budgetHeaders
    );

    console.log("All sheets initialized with headers successfully");
  } catch (error) {
    console.error("Error initializing sheet headers:", error);
    // Don't throw the error here - we've already created the spreadsheet, so just log it
  }
}

/**
 * Creates a missing sheet in the spreadsheet
 * @param accessToken Google OAuth Access Token
 * @param spreadsheetId The ID of the spreadsheet
 * @param sheetName The name of the sheet to create
 */
async function createMissingSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string
): Promise<void> {
  const url = `${SHEETS_API_BASE}/${spreadsheetId}:batchUpdate`;

  const body = {
    requests: [
      {
        addSheet: {
          properties: {
            title: sheetName,
            gridProperties: { rowCount: 1000, columnCount: 10 },
          },
        },
      },
    ],
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    // Read error text in advance
    const errorText = response.ok ? null : await response.text();
    if (!response.ok) {
      // If duplicate sheet error, skip creation
      if (
        response.status === 400 &&
        errorText &&
        (errorText.includes("already exists") ||
          errorText.includes("Ya existe una hoja"))
      ) {
        console.warn(`Sheet '${sheetName}' already exists, skipping creation.`);
        return;
      }
      throw new Error(
        `Failed to create sheet ${sheetName}: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    console.log(`Successfully created missing sheet: ${sheetName}`);
  } catch (error) {
    console.error(`Error creating sheet ${sheetName}:`, error);
    throw error;
  }
}

/**
 * Initialize headers for a newly created sheet
 * @param accessToken Google OAuth Access Token
 * @param spreadsheetId The ID of the spreadsheet
 * @param sheetName The name of the sheet to initialize
 */
async function initializeMissingSheetHeaders(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string
): Promise<void> {
  try {
    let headers: string[][] = [];

    // Definir los encabezados según el tipo de hoja
    switch (sheetName) {
      case "Transactions":
        headers = [
          [
            "Date",
            "Type",
            "Description",
            "Category",
            "Amount",
            "Account",
            "Tags",
            "Recurring",
            "Notes",
            "ID",
          ],
        ];
        break;
      case "Accounts":
        headers = [
          [
            "Name",
            "Type",
            "Initial Balance",
            "Current Balance",
            "Currency",
            "Notes",
            "Last Updated",
            "ID",
          ],
        ];
        break;
      case "Categories":
        headers = [["Name", "Type", "Parent Category", "Budget", "ID"]];
        break;
      case "Budgets":
        headers = [
          ["Category", "Monthly Limit", "Start Date", "End Date", "Notes"],
        ];
        break;
      default:
        headers = [
          ["Column 1", "Column 2", "Column 3", "Column 4", "Column 5"],
        ];
        break;
    }

    // Actualizar la hoja con los encabezados
    await updateSheetData(
      accessToken,
      spreadsheetId,
      `${sheetName}!A1`,
      headers
    );
    console.log(`Headers initialized for sheet ${sheetName}`);
  } catch (error) {
    console.error(`Error initializing headers for ${sheetName}:`, error);
    throw error;
  }
}

/**
 * Initializes the Summary sheet with proper headers and structure
 */
export async function initializeSummarySheet(
  accessToken: string,
  spreadsheetId: string
): Promise<void> {
  try {
    // First, set up the headers for the Summary sheet to match what account-summary.tsx expects
    const headerValues = [["Concepto", "Valor"]];

    await updateSheetData(
      accessToken,
      spreadsheetId,
      "Summary!A1:B1",
      headerValues
    );

    // Add initial data matching the format in account-summary.tsx component
    const initialData = [
      ["Saldo total", "0"],
      ["Ingresos mensuales", "0"],
      ["Gastos mensuales", "0"],
      ["Ahorro mensual (%)", "0"],
    ];

    await updateSheetData(
      accessToken,
      spreadsheetId,
      "Summary!A2:B5",
      initialData
    );

    // Format the headers to be bold
    await formatSheetCells(accessToken, spreadsheetId, "Summary!A1:B1", {
      textFormat: { bold: true },
    });

    console.log("Summary sheet initialized successfully");
  } catch (error) {
    console.error("Error initializing Summary sheet:", error);
    throw error;
  }
}

/**
 * Formats cells in a specific range in a Google Sheet.
 * @param accessToken Google OAuth Access Token
 * @param spreadsheetId The ID of the spreadsheet.
 * @param range The A1 notation of the range to format (e.g., 'Sheet1!A1:B2').
 * @param format The formatting to apply to the cells.
 * @returns The result of the format operation.
 */
export async function formatSheetCells(
  accessToken: string,
  spreadsheetId: string,
  range: string,
  format: any
): Promise<any> {
  try {
    // Get the sheet ID
    const sheetName = range.split("!")[0];
    const sheetsResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!sheetsResponse.ok) {
      throw new Error(`Failed to get sheet ID: ${sheetsResponse.statusText}`);
    }

    const sheetsData = await sheetsResponse.json();
    const sheet = sheetsData.sheets.find(
      (s: any) => s.properties.title === sheetName
    );

    if (!sheet) {
      throw new Error(`Sheet '${sheetName}' not found`);
    }

    const sheetId = sheet.properties.sheetId;

    // Parse the range to get row and column indices
    const rangeMatch = range.split("!")[1].match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
    if (!rangeMatch) {
      throw new Error(`Invalid range format: ${range}`);
    }

    const startCol = columnLetterToIndex(rangeMatch[1]);
    const startRow = parseInt(rangeMatch[2]) - 1; // 0-based index
    const endCol = columnLetterToIndex(rangeMatch[3]);
    const endRow = parseInt(rangeMatch[4]) - 1; // 0-based index

    // Prepare the format request
    const formatRequest = {
      requests: [
        {
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: startRow,
              endRowIndex: endRow + 1,
              startColumnIndex: startCol,
              endColumnIndex: endCol + 1,
            },
            cell: {
              userEnteredFormat: format,
            },
            fields: "userEnteredFormat",
          },
        },
      ],
    };

    // Send the format request
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formatRequest),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to format cells: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Cells formatted successfully:", data);
    return data;
  } catch (error) {
    console.error("Error formatting cells:", error);
    throw error;
  }
}

/**
 * Converts a column letter (A, B, C, ...) to a 0-based column index
 * @param letter The column letter to convert
 * @returns The 0-based column index
 */
function columnLetterToIndex(letter: string): number {
  let index = 0;
  for (let i = 0; i < letter.length; i++) {
    index = index * 26 + letter.charCodeAt(i) - 64; // 'A' is 65 in ASCII
  }
  return index - 1; // Convert to 0-based index
}
