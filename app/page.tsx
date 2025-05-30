"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { AppLayout } from "@/components/app-layout";
import { Dashboard } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { findSheet, createSheet } from "@/lib/googleApi"; // Import helper functions
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useRefresh } from "@/contexts/RefreshContext";

export default function Home() {
  const { data: session, status } = useSession();
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [isLoadingSheet, setIsLoadingSheet] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isAPIsDisabledError, setIsAPIsDisabledError] = useState<boolean>(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const { t } = useTranslation();
  const { globalRefreshKey } = useRefresh();

  // Extraer la función fuera del useEffect y usar useCallback
  const initializeSheet = useCallback(async () => {
    if (session?.accessToken) {
      setIsLoadingSheet(true);
      setError(null);
      setIsAPIsDisabledError(false);
      try {
        let sheetId = await findSheet(session.accessToken);
        if (!sheetId) {
          console.log("Spreadsheet not found, creating one...");
          sheetId = await createSheet(session.accessToken);
          console.log("Spreadsheet created with ID:", sheetId);
        }
        setSpreadsheetId(sheetId);
      } catch (err: any) {
        // Automatically handle session expiration
        if (err.message?.includes("Unauthorized")) {
          console.log("Session expired during sheet init, redirecting to login.");
          await signOut();
          signIn("google");
          return;
        }

        console.error("Error initializing sheet:", err);
        
        // Extraer el Project ID si está presente en el mensaje de error
        const projectIdMatch = err.message?.match(/project\s+(\d+)/i);
        if (projectIdMatch && projectIdMatch[1]) {
          setProjectId(projectIdMatch[1]);
        }
        
        // Detectar específicamente el error de APIs deshabilitadas
        if (err.message?.includes("API has not been used") || 
            err.message?.includes("disabled") || 
            (err.message?.includes("403") && err.message?.includes("drive.googleapis.com"))) {
          setIsAPIsDisabledError(true);
        }
        
        // Mensaje de error más detallado para debugging
        const errorMsg = `Failed to initialize spreadsheet: ${err.message || 'Unknown error'}. 
          Status: ${err.status || 'N/A'}, 
          Code: ${err.code || 'N/A'}. 
          Please ensure Google Drive and Sheets APIs are enabled and permissions granted.`;
        
        console.log(errorMsg);
        setError(errorMsg);
      } finally {
        setIsLoadingSheet(false);
      }
    }
  }, [session]);

  useEffect(() => {
    if (status === "authenticated") {
      initializeSheet();
    }
  }, [status, initializeSheet]);

  if (status === "loading") {
    return <p>{t("cargando_sesion")}</p>;
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl mb-4">{t("bienvenido")}</h1>
        <p className="mb-6">{t("inicia_google_para_gestionar")}</p>
        <Button onClick={() => signIn("google")}>{t("iniciar_sesion_google")}</Button>
      </div>
    );
  }

  // Authenticated state
  return (
    <AppLayout spreadsheetId={spreadsheetId ?? undefined} accessToken={session?.accessToken}>
      {isLoadingSheet && <p>{t("inicializando_hoja")}</p>}
      
      {isAPIsDisabledError ? (
        <div className="bg-amber-50 border border-amber-300 text-amber-800 p-6 rounded-md mb-4">
          <h2 className="text-xl font-bold mb-4">{t("activar_apis_google")}</h2>
          <p className="mb-3">{t("habilitar_apis_texto")}</p>
          <ul className="list-disc ml-5 mb-4 space-y-1">
            <li><strong>Google Drive API</strong> - {t("api_drive_descripcion")}</li>
            <li><strong>Google Sheets API</strong> - {t("api_sheets_descripcion")}</li>
          </ul>
          
          <div className="bg-white p-4 rounded border border-gray-200 mb-4">
            <h3 className="font-semibold mb-2">{t("sigue_estos_pasos")}</h3>
            <ol className="list-decimal ml-5 space-y-2">
              <li>{t("ir_biblioteca_apis")}</li>
              <li>{t("buscar_drive_api")}</li>
              <li>{t("habilitar_drive_api")}</li>
              <li>{t("volver_biblioteca")}</li>
              <li>{t("buscar_sheets_api")}</li>
              <li>{t("habilitar_sheets_api")}</li>
              <li>{t("esperar_propagacion")}</li>
              <li>{t("volver_reintentar")}</li>
            </ol>
          </div>
          
          <div className="flex space-x-3">
            <Button 
              onClick={() => initializeSheet()}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {t("reintentar")}
            </Button>
            <Button 
              variant="outline"
              onClick={() => window.open(`https://console.cloud.google.com/apis/library?project=${projectId || ''}`, '_blank')}
            >
              {t("ir_consola_google")}
            </Button>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-300 text-red-800 p-4 rounded-md mb-4">
          <h3 className="font-semibold">{t("error")}</h3>
          <pre className="whitespace-pre-wrap text-sm mt-1 max-h-40 overflow-auto">
            {error}
          </pre>
          <div className="mt-2 flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => initializeSheet()}
            >
              {t("reintentar")}
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => signOut()}
            >
              {t("cerrar_sesion")}
            </Button>
          </div>
        </div>
      ) : null}
      
      {spreadsheetId && (
        <p className="text-sm text-gray-500 p-2">{t("usando_spreadsheet_id", { id: spreadsheetId })}</p>
      )}
      
      {/* Solo mostramos el Dashboard si tenemos un spreadsheetId */}
      {spreadsheetId ? (
        <Dashboard spreadsheetId={spreadsheetId} accessToken={session?.accessToken} />
      ) : !isLoadingSheet && !error && !isAPIsDisabledError ? (
        <div className="p-4 border rounded-md bg-yellow-50 my-4">
          <p>{t("esperando_inicializacion")}</p>
        </div>
      ) : null}
    </AppLayout>
  );
}
