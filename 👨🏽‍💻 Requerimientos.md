---
tags:
  - 📝nota_de_proyecto
📂 Proyecto: "[[../../../🧑🏽 Personal|🧑🏽 Personal]]"
⛓️‍💥 Links:
  - "[[../../../../📂 Mis proyectos|📂 Mis proyectos]]"
📄 Tipo: 📈 Cashé
📅 Fecha: 22-04-2025
---
# Cashé: Especificación Técnica de la Aplicación de Gestión Financiera Personal

## Descripción General de la Aplicación

Cashé es una aplicación **modular de gestión financiera personal** diseñada para ayudar a usuarios a administrar sus finanzas de forma integral. Se concibe como una aplicación web progresiva (PWA) multiplataforma, lo que significa que funciona en navegadores web y puede instalarse como app móvil (especialmente en Android) ofreciendo una experiencia similar a una app nativa. La primera versión de Cashé se enfocará en **simplicidad y privacidad**: aprovechará Google Sheets y Google Drive como base de datos en la nube del usuario, de modo que cada persona controle sus datos financieros en su propia cuenta de Google. La autenticación se realizará con la cuenta de Google del usuario para asegurar un acceso seguro y sin gestión de contraseñas adicionales.

**Principios de diseño clave:**

- _Modularidad:_ Cashé está dividida en módulos funcionales independientes (Finanzas, Cuentas, Tarjetas, Transferencias, Dashboard, etc.), lo que facilita su mantenimiento y futura expansión de funcionalidades.
    
- _Accesibilidad y usabilidad:_ La aplicación tendrá una interfaz clara y amigable, adaptable a distintos dispositivos (diseño responsive) y con soporte para modo oscuro y múltiples idiomas desde el inicio.
    
- _Experiencia PWA:_ Al ser PWA, Cashé será instalable y podrá funcionar offline en gran medida, brindando acceso inmediato a datos recientes incluso sin conexión. Un **Service Worker** manejará la caché y la sincronización en segundo plano para ofrecer capacidad fuera de línea y actualizaciones transparentes.
    
- _Innovación visual:_ Cashé presentará **gráficos interactivos y visualizaciones de datos avanzadas** para transformar números en información comprensible. Se enfatiza el diseño de un **dashboard** rico en visualizaciones (gráficas de gastos por categoría, evolución temporal de balances, etc.) con bibliotecas modernas de gráficos.
    
- _Privacidad y seguridad:_ Los datos financieros personales permanecerán en la hoja de cálculo del propio usuario (Google Sheets) dentro de su cuenta de Google. De esta forma no se comparten con servidores de terceros más allá de Google, reduciendo la superficie de exposición de información sensible. La comunicación entre la app y Google estará protegida mediante HTTPS y OAuth2.
    
- _Inteligencia Artificial asistiva:_ Aunque en etapas iniciales será básica, Cashé incorporará una capa de **análisis inteligente** para brindar consejos personalizados, detección de patrones de gasto y proyecciones financieras. La IA permitirá automatizar tareas como el seguimiento de gastos, categorización de transacciones y generación de informes detallados, y en el futuro podría proyectar saldos o predecir gastos futuros para ayudar en la planificación.
    

## Arquitectura General de la Solución

En su primera versión, Cashé tendrá una arquitectura **serverless** en el sentido de que no contará con un servidor backend propio; en cambio, utilizará los servicios de Google como backend de datos y autenticación. Más adelante, está prevista la posibilidad de agregar un backend dedicado (por ejemplo, implementado en Java) para ampliar funcionalidades, pero inicialmente la arquitectura se centra en los siguientes componentes:

- **Frontend (PWA):** Una aplicación web moderna construida con tecnologías web estándar (HTML, CSS y JavaScript) usando un framework moderno (p. ej. React). Será una Single Page Application que cargará los diferentes módulos según la navegación del usuario. Al ser PWA, incluirá un manifiesto web y un Service Worker para permitir instalación en pantalla de inicio, funcionamiento offline y notificaciones push en el futuro. El frontend se comunicará directamente con las APIs de Google para autenticación y manipulación de datos (Sheets/Drive), haciendo llamadas REST o usando bibliotecas cliente de Google. La aplicación se ejecuta totalmente en el lado del cliente (navegador), por lo que tras la carga inicial (que se puede alojar en cualquier servicio estático o CDN) no depende de servidor propio alguno.
    
- **Almacenamiento de Datos (Google Sheets y Drive):** Todos los datos financieros del usuario se almacenarán en una hoja de cálculo de Google Sheets en la cuenta de Google del usuario. Inicialmente, Cashé creará (o utilizará) un **archivo de Google Sheets** que servirá como base de datos ligera: cada pestaña (hoja) dentro de ese archivo representará una tabla de datos (por ejemplo, una hoja para _Transacciones_, otra para _Cuentas_, etc.). Google Sheets actúa como almacén central accesible desde cualquier dispositivo del usuario. Asimismo, Google Drive puede utilizarse para almacenar archivos relacionados (por ejemplo, fotos de recibos en el futuro) o para guardar configuraciones/plantillas. La **API de Google Sheets** permite leer/escribir en las hojas programáticamente, y la **API de Google Drive** permite crear archivos, organizar carpetas y controlar permisos. Este enfoque es viable y ha sido utilizado en otras aplicaciones: por ejemplo, _Budget_ es una PWA construida sobre la API de Google Sheets para llevar seguimiento de gastos e ingresos mediante una interfaz de hoja de cálculo. Cada usuario, al autenticarse, accederá únicamente a su propio archivo de Sheets, garantizando aislamiento de datos.
    
- **Integración con Google (OAuth 2.0):** Cashé usará el sistema de autenticación de Google para que el usuario inicie sesión con su cuenta. Se integrará mediante OAuth 2.0 (utilizando el **Google Identity Services** para aplicaciones web). Al iniciar sesión, el usuario otorga permiso a la app para acceder a sus Google Sheets/Drive, con lo cual se obtiene un token de acceso con alcance limitado (scopes específicos para hojas de cálculo y drive). Es necesario registrar la aplicación en la consola de Google Cloud, habilitar las APIs de Google Drive y Google Sheets, y obtener credenciales OAuth (tipo "Web application") y una API Key restringida para el dominio de la app. Estas credenciales se configuran en el frontend para posibilitar la comunicación con los servicios de Google de forma autenticada y segura. No se almacenan credenciales sensibles en la aplicación; el flujo OAuth redirige al usuario a Google y retorna un token seguro que la app usará temporalmente.
    
- **Opcional - Backend Futuro (API REST en Java):** Si bien no forma parte de la versión inicial, la arquitectura está pensada para poder incorporar más adelante un servidor backend. Este backend podría ser una API RESTful desarrollada en Java (por ejemplo con Spring Boot) que sirva como intermediario entre el frontend y los datos. En una fase avanzada, el backend permitiría migrar el almacenamiento de Google Sheets a una base de datos propia más robusta (SQL o NoSQL), gestionar lógica de negocio compleja en servidor, orquestar tareas programadas de forma centralizada y posibilitar funcionalidades multiusuario (como compartir finanzas con familia) de manera más segura. La aplicación frontend estaría diseñada de forma desacoplada, de modo que los módulos de datos pudieran apuntar a un servicio REST alternativo sin cambios drásticos en la interfaz. Durante la primera etapa, sin embargo, el backend no es necesario: el frontend interactúa directamente con Google, reduciendo complejidad inicial y costos de infraestructura.
    

En resumen, la primera versión de Cashé es esencialmente una **aplicación cliente pesada** (thick client) que utiliza Google Sheets/Drive como "servidor de datos". Esto permite un desarrollo ágil y aprovechar la confiabilidad de la nube de Google, a cambio de algunas limitaciones inherentes (por ejemplo, tasas de API, estructura de datos en hojas). La arquitectura modular del frontend asegura que cada funcionalidad (módulo) se gestione por separado, aunque comparta el mismo backend de datos. A continuación, se detalla cada módulo funcional y técnico de la aplicación.

## Módulos Funcionales y Detalles Técnicos

A continuación se describen los módulos principales de Cashé, incluyendo sus funciones para el usuario y consideraciones técnicas de implementación. Cada módulo corresponde a un conjunto de pantallas o secciones en la aplicación, así como a tablas/hojas dentro del almacenamiento en Google Sheets.

### Módulo de Finanzas (Transacciones y Presupuestos)

Este es el núcleo de la aplicación, donde el usuario registra y visualiza sus **movimientos financieros diarios** (transacciones de ingresos y gastos) y puede gestionar presupuestos por categoría.

**Funciones principales:**

- Registrar nuevas **transacciones** (gastos o ingresos) con detalles como fecha, descripción, monto, categoría de gasto/ingreso, método de pago o cuenta asociada, y etiqueta de recurrencia si aplica. La interfaz permitirá capturar estos datos de forma rápida, por ejemplo mediante un formulario modal o una pantalla dedicada de "Agregar Transacción".
    
- Listar y filtrar transacciones: el usuario puede ver un historial cronológico de movimientos financieros. Se ofrecerán filtros por rango de fechas, por categoría, por cuenta/tarjeta, etc., así como una búsqueda por texto para descripciones.
    
- **Categorías de gasto/ingreso:** El módulo manejará una lista de categorías (p. ej. Alimentación, Vivienda, Transporte, Salario, etc.), posiblemente configurable por el usuario. Cada transacción se asigna a una categoría, lo que permitirá análisis posteriores.
    
- **Presupuestos:** El usuario podrá definir presupuestos mensuales por categoría (ejemplo: límite de $300 en ocio al mes). El módulo Finanzas mostrará el progreso de gasto frente al presupuesto en cada categoría, alertando si se acerca o supera el límite. También podría manejar un presupuesto general mensual.
    
- **Calendario de gastos:** Integrado en este módulo (o accesible desde él) estará la vista de **calendario**, donde el usuario puede visualizar sus gastos en formato calendario mensual. Cada fecha mostrará el total gastado y los días se pueden resaltar según el nivel de gasto (útil para identificar patrones de gasto en ciertas fechas). Esta vista ayuda a relacionar gastos con días de la semana o eventos, y a navegar rápidamente por el historial temporal de gastos.
    

**Detalles técnicos y de datos:**

- **Estructura de datos en Google Sheets:** Habrá una hoja llamada por ejemplo "`Transacciones`" que almacene cada movimiento en una fila. Columnas típicas: ID (único para cada transacción, podría generarse automáticamente), Fecha, Descripción, Monto, Tipo (gasto o ingreso), Categoría, Cuenta/Tarjeta asociada, Recurrente (sí/no o periodo de repetición), y cualquier otro campo relevante (p. ej. una columna para marcar si es transferencia interna, etc.). El **ID** único puede ser un timestamp o un UUID generado por la app para facilitar futuras sincronizaciones y ediciones. El monto de los gastos se puede almacenar como número negativo para distinguirlos de ingresos (positivos), o bien tener una columna de tipo separada; esto se decidirá según facilite más los cálculos (usar positivos con campo tipo podría ser más legible en la hoja).
    
- **Registro y edición:** Al agregar una transacción, el frontend usará la API de Google Sheets para **append** (añadir) una nueva fila a la hoja de Transacciones. Google Sheets API permite operaciones de append y da la fila resultante. Para editar o eliminar transacciones, la app deberá localizar la fila (por ID u posición) y actualizarla o borrarla mediante llamadas a la API. Para eficiencia, se pueden hacer lotes de operaciones si se editan varias transacciones a la vez (por ejemplo, borrado masivo) usando las batch requests de la API REST de Sheets.
    
- **Cálculo de presupuestos:** Los límites de presupuesto por categoría pueden almacenarse en otra hoja (por ejemplo "`Presupuestos`": columnas de Categoría y Monto límite por mes). La aplicación, al mostrar el estado, sumará los gastos por categoría del mes actual (consultando la hoja de Transacciones, posiblemente filtrando por fecha y categoría) y comparará con el límite. Esto puede hacerse en el frontend (cargando todas las transacciones del mes y filtrando en código) o mediante fórmulas en la propia hoja de cálculo. En la fase inicial, es más sencillo realizar el cálculo en la aplicación para tener flexibilidad, aunque se podría aprovechar Google Sheets para cálculos con funciones SUMIFS u similares.
    
- **Calendario:** Para la vista de calendario de gastos, el frontend consolidará los datos por día. Técnicamente, esto implica tomar todas las transacciones de un mes y agrupar por fecha (sumando montos de gastos netos por día). Estos datos alimentarán un componente calendario. Se puede usar una biblioteca de calendario o generar dinámicamente una cuadrícula HTML. El resultado es interactivo: el usuario podría hacer clic en un día para ver detalle de transacciones de ese día.
    
- **Interfaz:** La pantalla principal de Finanzas puede mostrar un resumen del mes en curso (total gastado vs ingresado, ahorro neto, presupuesto usado, etc.), seguido de la lista de transacciones recientes o la vista de calendario. Debe haber opciones para añadir nueva transacción fácilmente (un botón flotante “+” por ejemplo) y para cambiar entre vista lista y vista calendario. En cuanto a UX, se buscará que añadir un gasto sea lo más rápido posible (por ejemplo, reutilizando la última categoría usada, o permitiendo entrada por voz en el futuro).
    

### Módulo de Cuentas (Gestión de Cuentas Bancarias y Efectivo)

El módulo de Cuentas permite al usuario llevar registro de sus distintas **cuentas financieras** – por ejemplo cuentas bancarias, cuentas de efectivo, billeteras digitales, etc. – y conocer el saldo actual en cada una.

**Funciones principales:**

- **Crear/editar cuentas:** El usuario puede dar de alta sus cuentas financieras con atributos como nombre de la cuenta (p. ej. "Cuenta Nómina Banco X"), tipo de cuenta (corriente, ahorro, efectivo, etc.), moneda (si se soportan múltiples monedas, aunque inicialmente se puede asumir una moneda principal), saldo inicial o actual, y posiblemente campos específicos según el tipo (por ejemplo, últimas 4 cifras si es cuenta bancaria para identificar, o tasa de interés si fuese relevante).
    
- **Listado de cuentas:** Se mostrará una lista de las cuentas registradas, con su saldo actual calculado. Esta lista podría presentarse en forma de tarjeta o filas, indicando nombre de la cuenta, tipo/ícono y saldo disponible. Por ejemplo: "Cuenta Ahorros - $5,000", "Efectivo - $200", etc.
    
- **Detalle de cuenta:** Al seleccionar una cuenta, el usuario podría ver información detallada: historial de transacciones relacionadas a esa cuenta (filtrando la lista del módulo Finanzas para solo mostrar movimientos de dicha cuenta), gráfico de evolución de saldo en el tiempo para esa cuenta, y opciones como editar los detalles de la cuenta o eliminarla si ya no se usa.
    
- **Resumen global:** El módulo de Cuentas también contribuye a mostrar el **patrimonio neto** del usuario, calculado como la suma de saldos de todas las cuentas (posiblemente mostrado en el Dashboard). Cada vez que se agrega una transacción que afecta una cuenta, el saldo de esa cuenta cambia; la app debe reflejar esos cambios en tiempo real.
    

**Detalles técnicos y de datos:**

- **Estructura de datos:** Se tendrá una hoja en Google Sheets llamada p. ej. "`Cuentas`". Cada fila representa una cuenta. Columnas sugeridas: ID de cuenta (único), Nombre, Tipo (valor de lista predefinida: ahorro, corriente, efectivo, tarjeta crédito, etc.), Moneda, Saldo Inicial, Saldo Actual (este campo podría ser calculado dinámicamente sumando transacciones, o bien actualizado por la app cada vez). Adicionalmente, podría haber columnas como "Límite de crédito" (si es tarjeta de crédito, ver módulo Tarjetas) o "IncluidaEnBalance" (un booleano por si alguna cuenta no se considera en el total, aunque probablemente innecesario inicialmente).
    
- **Cálculo de saldos:** Hay dos enfoques posibles:
    
    1. **Cálculo dinámico:** No almacenar el saldo actual en la hoja, sino calcularlo en la aplicación sumando las transacciones correspondientes a esa cuenta (sumar todos los ingresos menos egresos asociados). Esto asegura integridad (siempre concuerda con transacciones) pero implica procesar posiblemente muchas transacciones en el cliente cada vez.
        
    2. **Actualización incremental:** Mantener en la hoja un campo de Saldo Actual que la app actualiza cada vez que se registra una nueva transacción o transferencia que afecte esa cuenta. Por ejemplo, al insertar una transacción de gasto de $100 en la cuenta X, también se podría programar la app para restar $100 del saldo de la cuenta X en la hoja Cuentas. Este método reduce cómputo en lecturas (ya tienes el saldo listo) a cambio de mayor complejidad en escrituras (asegurar que siempre se actualice el saldo, incluso si hay escrituras fuera de la app).  
        Inicialmente, se puede optar por **calcular dinámicamente en el cliente** al cargar, ya que el volumen de datos personales no será enorme. Más adelante, si el rendimiento fuera un problema, se puede optar por actualizar saldos en la hoja con fórmulas SUMIFS en Google Sheets o mediante actualizaciones directas vía API cuando ocurren cambios.
        
- **Integración con transacciones:** Cuando el usuario agrega una transacción en el módulo Finanzas, deberá seleccionar a qué cuenta se aplica (ej. pago con Tarjeta Visa, o retiro de Cuenta Bancaria). La app registrará esa referencia (p. ej. nombre o ID de cuenta) en la transacción. Así, para filtrar transacciones por cuenta o recalcular saldos, se utiliza esa relación. Se deben manejar también **transferencias internas** (ver módulo Transferencias) ya que afectan dos cuentas.
    
- **Monedas múltiples:** Si se soporta más de una moneda, cada cuenta tendría su moneda. En tal caso, los totales globales requerirían conversión a una moneda base para sumar (lo cual implica tener tasas de cambio actualizadas, quizás fuera del alcance inicial). Probablemente la primera versión asume una moneda única configurada para el usuario, simplificando la lógica.
    
- **Interfaz y UX:** La sección de Cuentas proveerá una vista rápida de la salud financiera por cuenta. Debe permitir reorganizar las cuentas (orden personalizable), y mostrar íconos relevantes (por ejemplo, un ícono de banco, de billetera, de tarjeta). También podría ofrecer un **botón de agregar transferencia** directamente desde una cuenta (ej. "Mover dinero desde esta cuenta a otra"), facilitando la navegación hacia el módulo de Transferencias preseleccionando la cuenta origen.
    

### Módulo de Tarjetas (Gestión de Tarjetas de Crédito/Débito)

El módulo de Tarjetas se enfoca en el manejo de **tarjetas de crédito y débito** que el usuario posea, con algunas consideraciones especiales para las tarjetas de crédito (como ciclos de facturación, pagos mínimos, etc.). Aunque conceptualmente las tarjetas se pueden tratar como un tipo de cuenta, se las separa en un módulo dedicado para resaltar sus particularidades y facilitar su gestión específica.

**Funciones principales:**

- **Registrar tarjetas:** Permite añadir tarjetas de crédito o débito, con datos como nombre (p. ej. "Visa Banco X"), tipo (crédito o débito), entidad bancaria emisora, límite de crédito (en caso de tarjetas de crédito), fecha de corte y fecha de pago (ciclo mensual) para las tarjetas de crédito, y posiblemente tasa de interés (si se quiere calcular intereses de financiamiento). Para tarjetas de débito, básicamente son cuentas bancarias, por lo que podrían ser tratadas como referencias a una cuenta existente; en la UI podríamos distinguirlas solo visualmente.
    
- **Listado de tarjetas:** Muestra todas las tarjetas agregadas, indicando para las de crédito el saldo actual gastado del ciclo vs el límite (por ejemplo "Gastado $2000 de $5000"), o el disponible. Para tarjetas de débito, se podría simplemente mostrar el balance de su cuenta asociada (o marcarlas como "débito" junto al nombre). Cada tarjeta se mostrará con su tipo, últimos dígitos (para identificación), logo de la marca (Visa, Mastercard, etc., si se permite cargar/seleccionar), y estado actual.
    
- **Detalle de tarjeta:** Al entrar en una tarjeta específica, el usuario verá información detallada. Para una tarjeta de crédito: las transacciones hechas con esa tarjeta durante el ciclo actual (filtradas de la lista general), el monto total a pagar en el próximo vencimiento, la fecha de vencimiento próxima, y opciones como registrar un pago realizado a la tarjeta (por ejemplo, pagar la tarjeta desde una cuenta bancaria, lo que sería una transferencia interna). Para tarjeta de débito: se podría simplemente remitir a la cuenta asociada.
    
- **Alertas de vencimiento:** Se prevé que la aplicación pueda recordar al usuario próximas fechas de pago de sus tarjetas de crédito, posiblemente con notificaciones push o resaltados en el dashboard, para evitar moras. Estas alertas entrarían en la categoría de tareas programadas/recordatorios.
    

**Detalles técnicos y de datos:**

- **Estructura de datos:** Las tarjetas pueden almacenarse en la misma hoja de "`Cuentas`" con un tipo específico (p. ej. tipo = "Tarjeta Crédito" / "Tarjeta Débito") y campos adicionales, o en una hoja separada "`Tarjetas`". Dado que muchas propiedades de las tarjetas difieren de una cuenta bancaria tradicional, es razonable tener una hoja separada para Tarjetas: columnas como ID, Nombre, Tipo (crédito/débito), Banco, Límite (si crédito), Corte (día del mes), Vencimiento pago (día del mes), Cuenta de pago asociada (por ejemplo, qué cuenta usará para pagar la tarjeta), etc. Para tarjetas de débito, esta hoja podría igualmente listarlas pero marcando que son débito y referenciando la cuenta bancaria asociada.
    
- **Integración con transacciones:** Cada transacción en la hoja de Transacciones tendrá un campo de cuenta/tarjeta. Para gastos con tarjeta de crédito, se registran igual que otros gastos pero vinculados a la tarjeta correspondiente. El efecto en los datos: no reducen inmediatamente ningún saldo de cuenta (porque es deuda hasta pagar), pero sí cuentan para el gasto de categorías. Para reflejar el monto adeudado de la tarjeta, podríamos calcularlo sumando transacciones de esa tarjeta desde el último corte. Esto implica conocer la fecha de último corte: una simplificación es calcular siempre desde inicio de mes o mantener manualmente la fecha de cierre. Para la versión inicial, quizás no se calcule intereses ni se modela financiamiento; solo se lleva control del **gasto acumulado en la tarjeta en el ciclo actual**. Cuando el usuario marca que pagó la tarjeta (posiblemente registrando una transferencia desde una cuenta bancaria a la tarjeta por el monto total o parcial), ese pago se reflejaría como una transacción de tipo "Pago tarjeta" que reduce la deuda (podría haber una representación en la hoja Tarjetas de un campo "saldo ciclo actual" ajustado).
    
- **Cálculo de saldo de tarjeta:** Similar al saldo de cuenta, pero en tarjetas de crédito representa la deuda actual. Puede calcularse dinámicamente: para cada tarjeta de crédito, sumar todos los gastos hechos con ella en el ciclo vigente y restar los pagos realizados a esa tarjeta durante el ciclo. El ciclo se puede determinar por las fechas de corte: por ejemplo, si la tarjeta cierra el 10 de cada mes, y estamos después del 10, iniciar suma desde esa fecha. Este cálculo se haría en la aplicación al mostrar detalle de tarjeta. Alternativamente, se podría reiniciar un contador en la hoja Tarjetas cada vez que se pasa la fecha de corte (mediante alguna tarea programada o intervención manual) para resetear el gasto del ciclo. En primera instancia, la app puede simplificar y asumir que el ciclo es calendario mensual (1 al 30/31) para cálculos, o requerir al usuario pulsar un botón "Cerrar ciclo" que registre el reinicio. Estas son consideraciones avanzadas que se pueden aclarar en la implementación, procurando exactitud pero sin bloquear otras funciones.
    
- **Pagos y transferencias relacionadas:** Un pago de tarjeta se tratará en el módulo de Transferencias, pero es importante notarlo aquí: cuando el usuario realiza un pago, efectivamente es dinero que sale de una cuenta bancaria y reduce la deuda de la tarjeta. Idealmente, una única acción del usuario debería crear dos registros: una transacción de egreso en la cuenta bancaria y otra de abono (o etiqueta especial) en la tarjeta de crédito. La aplicación facilitará esto para mantener consistencia.
    
- **Interfaz:** En la pantalla de Tarjetas, el usuario debería distinguir claramente las tarjetas de crédito (con información de deuda actual, límite, etc.) de las de débito (que podrían simplemente remitir a la cuenta bancaria y no mostrar “deuda”). Se pueden usar colores o iconos (por ejemplo, color distinto para crédito). Al seleccionar una tarjeta de crédito, se puede mostrar un gráfico de anillo con % de uso del límite, o una barra de progreso. También un mini calendario o timeline de gastos con esa tarjeta, para que el usuario sepa en qué fechas la usó. La usabilidad debe enfocarse en que el usuario pueda controlar que no exceda su límite y que pague a tiempo: por ello la UI puede resaltar en rojo si el gasto se acerca al límite, o mostrar un aviso "Pago próximo en 5 días". Esas reglas se definen en la lógica de UI basadas en los datos ingresados (fecha de vencimiento, etc.).
    

### Módulo de Transferencias (Movimientos entre Cuentas)

Este módulo gestiona las **transferencias internas** de dinero, es decir, movimientos de fondos entre las cuentas del usuario (incluyendo tarjetas, en forma de pagos). Aunque conceptualmente las transferencias podrían considerarse una categoría de transacción, se separan para brindar una experiencia específica que asegure consistencia en ambas cuentas afectadas.

**Funciones principales:**

- **Registrar transferencia:** El usuario indica una cuenta origen, una cuenta destino, fecha, monto y descripción opcional de la transferencia. Ejemplos: "Transferir $500 de Cuenta Ahorros a Cuenta Corriente", "Pago de tarjeta Visa $200 desde Cuenta Nómina". La interfaz debe facilitar la selección de cuentas origen y destino (por ejemplo, listas desplegables que excluyan la misma cuenta en destino, etc.) y claramente mostrar que no se trata de un gasto ni ingreso "externo" sino un movimiento interno.
    
- **Ver historial de transferencias:** Una lista de las transferencias realizadas, con sus detalles, probablemente filtrable por rango de fechas. Esto ayuda a llevar control de movimientos internos (por ejemplo, cuánto dinero se movió a ahorros este mes). Puede integrarse esta lista en el historial general marcándolas de forma distinta, pero también tener su propia sección resumida.
    
- **Conciliación de transferencias:** Asegurar que por cada transferencia interna, ambas cuentas involucradas reflejen correctamente el movimiento (una disminuye saldo, otra aumenta). La aplicación puede evitar el doble ingreso manual registrando automáticamente ambos lados de la transacción.
    

**Detalles técnicos y de datos:**

- **Representación en datos:** Dado que se usa Google Sheets como base, hay varias formas de registrar una transferencia de forma consistente:
    
    - **Doble registro en hoja de Transacciones:** Registrar dos transacciones separadas: una salida (gasto) de la cuenta origen con categoría "Transferencia" y una entrada (ingreso) en la cuenta destino con categoría "Transferencia". Para vincularlas, se puede usar un mismo ID de transferencia en un campo adicional para saber que corresponden a la misma operación. Por ejemplo, columnas extra: `TransferID` que ambas comparten. La app al listar transacciones podría ocultar o agrupar estas como una única transferencia para no confundirlas con gastos/ingresos reales.
        
    - **Registro único en hoja específica:** Alternativamente, tener una hoja "`Transferencias`" donde cada fila indique Origen, Destino, Monto, Fecha, etc. La ventaja es claridad separada; la desventaja es duplicar lógica de actualización de saldos (habría que descontar y sumar a cuentas). Sin un backend, probablemente la opción de doble registro en la lista de transacciones sea más simple para mantener todo el historial financiero en un solo lugar, marcando de alguna forma que ciertas transacciones son traslados internos.  
        En la primera versión, optaremos por registrar las transferencias como **dos transacciones en la hoja de Transacciones**, ya que mantiene un solo historial cronológico. Nos aseguraremos de etiquetarlas adecuadamente (por ejemplo, en la columna Categoría se pone "Transferencia interna" para ambos, y quizá un sufijo "out"/"in" en la descripción).
        
- **Actualización de saldos:** Cuando se crea una transferencia, la app debe inmediatamente reflejar que:
    
    - El saldo de la cuenta origen decreció en X monto.
        
    - El saldo de la cuenta destino aumentó en X monto.  
        Si los saldos se calculan dinámicamente, esto se verá automáticamente porque las transacciones fueron añadidas. Si se lleva saldo en las hojas de cuentas, entonces tras insertar las transacciones, la app también actualizaría las filas de las dos cuentas en la hoja Cuentas (origen y destino) restando/sumando el monto. De nuevo, la consistencia es crítica: se deben realizar ambas operaciones (añadir dos transacciones y actualizar dos saldos) de forma atómica. Con Google Sheets, no hay transacciones, pero la app podría utilizar la Batch API call para enviar las 4 operaciones (2 adds, 2 updates) en una sola petición garantizando que todas ocurran juntas. En caso de fallo a mitad, la lógica de la app debe poder recuperarse (p.ej., si se añadió la salida pero no la entrada, detectar y reparar o avisar al usuario).
        
- **Evitar duplicación en informes:** Dado que las transferencias no representan ni gasto real ni ingreso real, se deben excluir de ciertos cálculos (por ejemplo, al calcular total gastado del mes, no contar transferencias). Esto se logra fácilmente filtrando por categoría ≠ "Transferencia" en las sumas. Si se mantiene en hoja separada, eso se evita por diseño pero complica saldos. Con el enfoque de doble transacción, es fundamental filtrar en los reportes. Esta lógica se implementará en el Dashboard y módulo Finanzas al hacer agregaciones.
    
- **Interfaz de usuario:** Al agregar una transferencia, la experiencia debe diferenciarse de agregar un gasto normal para evitar confusión. Por ejemplo, el botón "Nueva transferencia" puede llevar a un formulario distinto al de "Nuevo gasto", con dos selectores de cuenta (origen/destino) en lugar de categoría. También se puede incorporar atajos: desde la lista de Cuentas, un botón "Transferir desde esta cuenta" que abre el formulario con origen ya seleccionado. Para la visualización, se podría usar un icono especial o color en la lista de transacciones para indicar que ciertas entradas son transferencias (ej. un ícono de flechas opuestas). En el módulo de Transferencias, la lista podría mostrarse en formato "Cuenta A → Cuenta B: $X el 12/05/2025". Esto mejora la lectura para el usuario respecto a ver dos transacciones separadas.
    

### Módulo de Dashboard (Tablero de Control)

El Dashboard es la pantalla principal de resumen donde el usuario obtiene una **visión global** de su situación financiera y hallazgos importantes. Reúne información de los otros módulos para presentarla de forma sintetizada y visual.

**Funciones principales:**

- **Resumen de cuentas y patrimonio:** Mostrar el total de dinero del usuario (suma de saldos de todas las cuentas positivas menos deudas de tarjetas, es decir patrimonio neto). También puede listar las cuentas principales con sus saldos de manera breve.
    
- **Gastos e ingresos recientes:** Un apartado con los totales de gastos e ingresos del mes en curso (o semana actual), posiblemente con un indicador de si el usuario está ahorrando o gastando más de lo habitual.
    
- **Gráficos interactivos:** Esta es una parte clave del Dashboard. Se incluirán varias visualizaciones, tales como:
    
    - **Gráfico de distribución de gastos por categoría** (e.g., un gráfico de pastel o donut) mostrando en qué porcentajes se van los gastos del mes por categoría. Esto ayuda a identificar en qué rubros se gasta más.
        
    - **Gráfico de tendencia temporal** (p. ej. línea o área) de saldo o gastos vs ingresos a lo largo de los últimos meses. Por ejemplo, una curva de saldo total mes a mes, o barras comparando gastos e ingresos mes a mes.
        
    - **Gráfico de flujo de caja** por mes (barras apiladas de ingresos vs gastos) o incluso un **histograma** de gastos diarios para ver distribución.  
        Estos gráficos serán interactivos: al pasar el cursor o tocar segmentos, se mostrarán detalles (tooltips con cifras exactas), y podrían permitir acciones como filtrar (ejemplo: tocar una categoría en el pastel podría navegar a la lista de transacciones filtrada por esa categoría).
        
- **Alertas y recomendaciones (IA):** El dashboard también servirá para desplegar notificaciones importantes generadas por la lógica de IA/analítica. Por ejemplo: “Aviso: Tu gasto en Restaurantes este mes ha excedido en 20% el promedio. Considera ajustar tu presupuesto.”, o “¡Buen trabajo! Alcanzaste tu objetivo de ahorro este mes.”. Estas recomendaciones personalizadas aparecerán en un recuadro destacado, posiblemente con iconografía (un ícono de asistente o luz de sugerencia).
    
- **Próximos eventos financieros:** Sección donde figuren próximos pagos o transacciones recurrentes programadas. Por ejemplo: “Recordatorio: Pago de tarjeta Visa en 3 días ($200)”. Esto permite al usuario prepararse y es parte de la sincronización/tareas programadas.
    

**Detalles técnicos y de datos:**

- **Agregación de datos:** El Dashboard realizará varias **consultas agregadas** a los datos en Google Sheets para componer sus visualizaciones. En la arquitectura actual sin backend, esto significa que el frontend descargará los datos necesarios (posiblemente todo el conjunto de transacciones y cuentas, almacenados en memoria/local) y luego realizará los cálculos con JavaScript. Por ejemplo, para la gráfica de gastos por categoría: filtrar transacciones del mes actual con tipo gasto y sumar por categoría. Para la gráfica de tendencia: agrupar transacciones por mes y calcular sumas totales. Estas operaciones se pueden optimizar usando funciones de array de Google Sheets (enviando una query via API que sume, aunque esto es complejo con la API REST básica) o simplemente haciéndolo en el cliente dado que los volúmenes son manejables. Un punto intermedio es usar Google Sheets con fórmulas avanzadas o tablas dinámicas predefinidas: por ejemplo, una hoja "ResumenDashboard" en Sheets con fórmulas que calculen todos estos indicadores a partir de los datos, de modo que la app solo lee esos resultados. Sin embargo, crear esas fórmulas automáticamente podría ser complejo; se puede evaluar para futuras versiones. Inicialmente, se asumirá que la app compone los cálculos.
    
- **Biblioteca de gráficos:** Para implementar las gráficas interactivas, se empleará una biblioteca JavaScript especializada. Una opción popular es **Chart.js**, que permite crear gráficos de torta, barras, líneas, etc., de forma sencilla e interactiva, integrándose bien con frameworks como React. Chart.js soporta interactividad básica (tooltips, leyendas clicables) y es suficientemente potente para las necesidades descritas. Otra alternativa es **D3.js** para personalizar completamente las visualizaciones, aunque D3 tiene una curva de aprendizaje mayor; podría usarse D3 para gráficos personalizados en caso que Chart.js no cubra algún requerimiento de animación o formato. También existen librerías orientadas a React como **Recharts** o **Victory** que envuelven D3/Canvas para facilitar la integración. En esta especificación se sugiere comenzar con Chart.js por su facilidad y soporte de comunidad, manteniendo la posibilidad de cambiar o complementarla si se requieren visualizaciones más avanzadas. El objetivo es lograr gráficos fluidos y responsivos; por ejemplo, que se adapten al ancho de pantalla, y que en móvil se puedan scroll si son muy anchos.
    
- **Actualización en tiempo real:** Cuando el usuario agrega una transacción o cambia datos en otro módulo, el Dashboard deberá actualizar sus números inmediatamente para reflejarlo (por ejemplo, si agrega un gasto, el gráfico de categoría y el total gastado del mes cambian). Gracias al enfoque de aplicación cliente, esto es factible: tras cada operación de escritura exitosa a Sheets, la app puede recalcular localmente los totales (usando el mismo dato que envió sin esperar volver a leer toda la hoja) y actualizar los componentes del Dashboard. Sin embargo, si el usuario tiene la app abierta en dos dispositivos simultáneamente mirando el Dashboard, la sincronización en tiempo real entre dispositivos dependerá de la periodicidad de fetch de datos (ver Sincronización). Podríamos implementar un **WebSocket** o similar para notificaciones en tiempo real si tuviéramos un backend; sin backend, quizás rely en la actualización manual o periódica. Es aceptable en la primera versión que el usuario refresque el dashboard manualmente para ver cambios de otro dispositivo.
    
- **Diseño visual:** El dashboard debe ser visualmente atractivo y ordenado. Se recomienda un diseño de **tarjetas** o widgets: por ejemplo, una tarjeta grande con el patrimonio y balance general, debajo dos tarjetas medianas lado a lado (una con gastos vs ingresos, otra con progreso de presupuesto), luego una sección de gráficos a pantalla completa de pastel y línea, etc. Utilizar un estilo consistente (por ejemplo, basado en Material Design o similar) para que los gráficos y textos mantengan la estética general de la app. Aprovechar el modo oscuro/claro en los gráficos también (muchas librerías permiten temas o se les puede personalizar colores).
    

### Módulo de Análisis Inteligente (Asistente IA)

Este módulo (conceptual, podría no ser una pantalla separada sino un conjunto de funcionalidades integradas) proporciona **análisis automatizado e inteligencia artificial** para ofrecer al usuario insights y consejos personalizados sobre sus finanzas. Dado que es un aspecto incipiente en la primera versión, se enfocará en descripciones funcionales de lo que hará, con implementaciones sencillas, pero sentando las bases para ampliar las capacidades de IA más adelante.

**Funciones principales:**

- **Análisis de patrones de gasto:** La IA revisará las transacciones históricas para identificar patrones o anomalías. Por ejemplo, puede detectar que cierto mes hubo un gasto inusualmente alto en una categoría particular, o que los gastos en suscripciones se incrementan gradualmente. Estos hallazgos se traducirán en notificaciones o recomendaciones.
    
- **Consejos de ahorro personalizados:** Basado en los patrones detectados y los presupuestos definidos, el asistente podría sugerir acciones concretas. Ejemplos: "Estás gastando mucho en comidas fuera de casa; considerar cocinar más podría ahorrarte X al mes", o "Tienes suscripciones que no utilizas frecuentemente, evaluar cancelarlas te ahorraría X al año". Estos consejos se generarían a partir de reglas predefinidas combinadas con los datos del usuario, y en el futuro podrían refinarse con modelos de machine learning entrenados con datos de muchos usuarios (teniendo cuidado con la privacidad, quizás entrenando modelos genéricos y aplicándolos localmente).
    
- **Proyecciones financieras:** El sistema puede realizar proyecciones simples a futuro, por ejemplo: extrapolar el balance a fin de mes dado el ritmo actual de gastos, o proyectar el ahorro a 6 meses si mantiene ciertas tendencias. También podría simular escenarios: "Si reduces 10% tus gastos en entretenimiento, tu ahorro a fin de año sería Y". Esto ayuda al usuario en la planificación. Inicialmente, estas proyecciones pueden basarse en cálculos determinísticos (p. ej., promedio mensual) más que en algoritmos predictivos complejos. Sin embargo, la intención es evolucionar a predicciones más inteligentes. Herramientas de IA en finanzas personales como PocketSmith ya ofrecen este tipo de previsiones para ayudar a planificar a largo plazo.
    
- **Clasificación automatizada de transacciones:** Un componente de IA muy útil es el **autotagging**: cuando ingresa una nueva transacción (especialmente si se importara de bancos en el futuro), la IA podría sugerir o asignar automáticamente la categoría adecuada basándose en el texto de la descripción o historial (por ejemplo, reconoce "Starbucks" y la clasifica en Restaurantes). Esto mejora la usabilidad al reducir el trabajo manual. En la primera versión, si todas las transacciones son ingresadas manualmente por el usuario, la clasificación automática no es crítica, pero se puede implementar un recordatorio inteligente de última categoría usada con ese proveedor. Más adelante, al conectar con datos bancarios, esta funcionalidad aumentará en importancia (posible uso de modelos de procesamiento de lenguaje natural entrenados en descripciones de transacciones).
    
- **Interacción con el usuario (Asistente):** Se puede concebir una interfaz de asistente conversacional o semi-conversacional para la IA. Por ejemplo, un chatbot integrado donde el usuario pueda preguntarle cosas: "¿Cómo puedo ahorrar más?" o "¿En qué gasté más este mes?" y el sistema responda con datos. Esto sin duda es un nivel más avanzado; inicialmente, las recomendaciones serán unidireccionales (del sistema al usuario). Pero el diseño dejará espacio para que, en futuras versiones, se pueda incorporar un chat de finanzas (posiblemente alimentado por un modelo de lenguaje) que responda preguntas utilizando los datos del usuario.
    

**Detalles técnicos y de implementación de IA:**

- En la versión inicial, muchas de las “IA” propuestas se pueden implementar mediante **reglas heurísticas y algoritmos tradicionales de análisis de datos**. Por ejemplo, calcular promedios y desviaciones para detectar anomalías (gasto fuera de rango típico) y luego disparar un mensaje predefinido. O comparar gasto actual del mes vs mismo mes en los últimos 3 años (si hubiera historial) para ver incrementos. Estas reglas se pueden codificar en JavaScript fácilmente.
    
- Si se desea incorporar aprendizaje automático, podría integrarse una librería como **TensorFlow.js** para ejecutar modelos en el navegador. Un caso de uso podría ser entrenar un pequeño modelo de series de tiempo con los datos históricos del usuario para predecir su saldo futuro o gasto próximo mes. Dado que los datos son privados, se puede hacer que el entrenamiento ocurra localmente en su dispositivo (entrenamiento federado no aplica aquí ya que es 1 usuario, 1 modelo local). Sin embargo, esto es complejo y posiblemente innecesario en primeras etapas.
    
- Otra opción es consumir un **servicio de IA externo**: Por ejemplo, usar una API de un servicio financiero inteligente o incluso un LLM (Large Language Model) alojado que procese los datos y devuelva consejos. Esto, sin embargo, chocaría con la premisa de privacidad (enviar datos a terceros). A menos que se anonimice o se envíen solo agregados, podría ser sensible. Se optará inicialmente por implementar la IA _on-device_ o usando únicamente las capacidades de Google (que ya tiene los datos en Sheets). Google ofrece herramientas como **Google Apps Script** que podrían usarse para correr análisis dentro de la hoja de cálculo misma (e.j., un script que recorra transacciones y alerte condiciones), o incluso servicios de IA de Google Cloud (AutoML, etc.) pero eso requeriría un backend. En esta especificación se definirá la funcionalidad, dejando la implementación técnica detallada de los algoritmos para la fase de desarrollo, con la recomendación de empezar con enfoques determinísticos simples y evolucionar a ML conforme se entienda mejor el uso real.
    
- **Integración en la UI:** Los hallazgos de la IA se integrarán principalmente en el Dashboard (sección de alertas/recomendaciones) y posiblemente en otras partes: por ejemplo, si al agregar una transacción grande el sistema reconoce un posible gasto inusual, podría inmediatamente mostrar un aviso "Este gasto es elevado comparado a tu promedio". Otro ejemplo: en el módulo Finanzas, un botón "Analizar mis gastos" podría dar lugar a una pantalla o modal donde el asistente enumere algunos insights (como un breve informe: "Resumen Inteligente de tus Finanzas"). Esto puede estructurarse como un informe mensual generado automáticamente.
    
- **Mejoras futuras:** A medida que se tengan más datos de uso, se puede aplicar IA para personalizar más la experiencia. Por ejemplo, ajustar automáticamente los presupuestos recomendados según hábitos, o predecir el puntaje crediticio. La arquitectura modular permite incluso encapsular la IA como un servicio separado (por ejemplo, en el futuro un microservicio que reciba datos resumidos y devuelva recomendaciones), pero inicialmente lo mantendremos dentro de la app por simplicidad.
    

Con la funcionalidad de cada módulo explicada, resumimos la relación: Los módulos **Finanzas, Cuentas, Tarjetas y Transferencias** manejan la entrada y organización de datos básicos; el módulo **Dashboard** consume esos datos para mostrar información integrada; y el **módulo IA** analiza esos datos para extraer conclusiones y guiar al usuario. En conjunto, estos componentes cumplen los objetivos de Cashé de proveer una gestión financiera completa y fácil de usar.

## Selección de Tecnologías

Para implementar Cashé de manera óptima, es crucial elegir tecnologías modernas y robustas que se ajusten a los requisitos funcionales y no funcionales (PWA, visualizaciones, IA ligera, etc.). A continuación, se detallan las tecnologías y herramientas recomendadas para cada parte de la aplicación:

### Framework Frontend (PWA)

Se recomienda utilizar **React** como biblioteca principal de frontend para construir la interfaz de Cashé. React es un framework JavaScript modular y ampliamente adoptado, ideal para construir SPAs reactivas y PWA. Sus beneficios incluyen un ecosistema enorme de componentes y librerías, lo que encaja con la filosofía modular de Cashé. Por ejemplo, existe integración sencilla con librerías de gráficos (Chart.js tiene wrappers para React) y con Google APIs. Además, React combinada con herramientas como Create React App o Next.js facilita configurar una PWA (incluyendo generación de Service Worker, pre-caching, etc.). De hecho, ya hay ejemplos exitosos de apps financieras PWA construidas con React y Google Sheets.

Como alternativa, **Angular** podría considerarse, ya que ofrece una estructura más completa out-of-the-box (incluye su propio router, soporte PWA, etc.) y es mantenido por Google (lo cual podría integrarse bien con servicios Google). Angular es excelente para aplicaciones de mayor escala y proporciona un potente sistema de inyección de dependencias y arquitectura modular. Sin embargo, su curva de aprendizaje es mayor si el equipo no lo conoce, y React proporciona más flexibilidad con menos sobrecarga inicial. Otra alternativa es **Vue.js**, conocido por su sencillez y rendimiento, que también soporta PWA fácilmente mediante su CLI.

Dado el entorno actual, nos inclinamos por **React con Create React App** (o Next.js si se desea SSR parcial, aunque para una app personal SSR no es crítico). Create React App puede generar una PWA configurada, incluyendo un Service Worker basado en Workbox para caching. Se complementará con **React Router** para manejar la navegación entre módulos (ej. rutas `/cuentas`, `/finanzas`, etc.). Para la gestión de estado global (como los datos cargados de Google Sheets que deben ser accesibles en varios componentes), se puede usar el Context API de React o librerías como **Redux** if complexity grows. Probablemente un state management ligero con Context + Hooks sea suficiente al inicio, dado que la mayor parte de los datos cabrán en memoria y la estructura no es extremadamente compleja.

### Diseño de Interfaz (UI Kits y Temas)

Para acelerar el desarrollo de una interfaz atractiva y consistente, se puede utilizar una librería de componentes UI. Dos buenas opciones son **Material-UI (MUI)** para React o **Ionic React**. Material-UI ofrece componentes ya estilados siguiendo las guías de Material Design de Google, lo que se alinea con muchas expectativas de usuarios Android/web y fácilmente soporta theming (modo oscuro/claro). De hecho, usar Material-UI brindaría acceso a componentes como AppBar, Drawer (menú lateral para navegación), Tablas, Formularios, etc., personalizables. En experiencias pasadas, se ha visto que Material Design implementado con React produce interfaces limpias y familiares. Ionic Framework, por su parte, provee componentes con estilo móvil que funcionan en React y facilitan crear apps muy similares a nativas (con gestos, transiciones móviles). Ionic además simplifica cosas como estilos adaptativos iOS/Android. La elección puede basarse en preferencia de estilo: **Material-UI** parece apropiado para una PWA financiera orientada a productividad.

En cuanto al **modo oscuro**, tanto Material-UI como Ionic soportan theming. Con Material-UI, se definiría un tema claro y otro oscuro y se permitiría al usuario alternar (o seguir la preferencia del sistema automáticamente). Esto implicará garantizar que gráficos y elementos personalizados también cambien de paleta (por ejemplo, Chart.js permite definir colores de fondo/texto para adaptarse al tema). Desde un punto de vista técnico, implementar modo oscuro implica definir variables CSS o temas globales y aplicar clases o contextos de tema. Se priorizará que todos los componentes tengan suficiente contraste en ambos modos para mantener accesibilidad.

El **diseño responsive** se asegurará utilizando las rejillas (Grid/Flexbox) provistas por el framework de UI o CSS moderno. Así, los componentes como gráficos que en escritorio pueden mostrarse lado a lado, en pantallas pequeñas se apilarán verticalmente. También se considerará la navegación: en mobile posiblemente se use un menú inferior tipo pestañas (tab bar) para acceder a Dashboard, Finanzas, Cuentas, etc., mientras que en desktop quizás un menú lateral. React Router junto con el layout adaptativo permitirá estas variaciones.

### Biblioteca de Gráficos y Visualización de Datos

Como mencionado en el módulo Dashboard, se optará por **Chart.js** como la biblioteca principal de gráficos inicialmente. Chart.js es ligero, open-source y soporta los tipos de gráficos requeridos (línea, barra, pastel, etc.) con animaciones y interacción básica. Su integración es sencilla (solo instalar el paquete y pasarle datos JSON para renderizar). Es adecuado para mostrar visualizaciones financieras básicas de manera rápida.

Para necesidades más avanzadas de visualización interactiva, se deja la puerta abierta a incorporar **D3.js**. D3 permitiría, por ejemplo, gráficos personalizados como un calendario de calor (heatmap) para el calendario de gastos, o visualizaciones no estándar. También se podría usar **Plotly.js** o **Echarts** si se quisieran gráficos más sofisticados con zoom, pero podrían ser excesivos. Chart.js probablemente cubrirá 90% de los requisitos.

Adicionalmente, Chart.js tiene plugins y configuraciones para manejar responsive resizing (importante para PWA) y para integrar con frameworks. Por ejemplo, hay un wrapper llamado `react-chartjs-2` para usar Chart.js en React fácilmente. Esto será aprovechado.

En el futuro, si el dashboard evoluciona a ofrecer personalización de gráficos o más data viz, se evaluará incorporar librerías especializadas o incluso servicios de BI embebidos. Por ahora, la solución de Chart.js equilibra simplicidad y funcionalidad.

### APIs de Google (Sheets, Drive, Auth)

Integrar correctamente las APIs de Google es fundamental, dado que Google Sheets y Drive son el backend de datos. Las tecnologías concretas a usar son:

- **Google Sheets API v4:** Proporciona endpoints REST para leer, escribir, actualizar y borrar datos en hojas de cálculo. Desde el frontend, se puede llamar a estos endpoints usando `fetch` o axios, adjuntando el token de autenticación en el header. Google también ofrece una librería cliente JavaScript (gapi) que facilita hacer llamadas a Sheets. Una alternativa muy útil es la librería comunitaria **google-spreadsheet (npm)** que abstrae detalles y permite acceder a la hoja de cálculo como objeto; sin embargo, esa librería requiere Node.js (server or functions) o un bundler con compatibilidad. Dado que estamos en un PWA, usaremos probablemente llamadas directas a la API REST a través de `fetch` con los tokens OAuth. Para simplificar, tras autenticarse podríamos obtener el **ID de la hoja de cálculo** de Cashé (posiblemente almacenado en un campo de usuario en Drive, o por convención nombrada "Cashé Finance Data"). Con el ID, las llamadas a la API de Sheets se hacen a URLs como `https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}/values/{range}` para leer valores, etc. Vale notar que la API de Sheets permite operaciones batch y también lectura de rango completo de una hoja.
    
- **Google Drive API:** Se utilizará principalmente para actividades como crear la hoja de cálculo inicial en el Drive del usuario (por ejemplo, la primera vez que alguien usa Cashé, la app podría crear un archivo "Cashé - Mis Finanzas" en su Google Drive mediante la API). También serviría para listar/backupear o para guardar archivos adjuntos. Los scopes de OAuth incluirán Drive file access. Un posible enfoque seguro es usar un scope restringido llamado "Drive App Folder" que solo permite acceso a una carpeta privada de la app en Drive; pero en este caso, quizás sea mejor crear el archivo y almacenar su ID para luego acceder específicamente a ese. La API de Drive también podría permitir exportar datos (p. ej. generar un PDF o CSV del resumen, guardarlo en Drive).
    
- **Google Authentication (OAuth 2.0):** Como descrito, usaremos **Google Identity Services** for Web. Google provee un script fácil de integrar que muestra un botón de "Sign in with Google" y maneja el popup de OAuth. Al finalizar, entrega a la aplicación un `credential` (ID token/JWT y possibly an access token). Alternativamente, se puede hacer el flujo OAuth manualmente. Lo importante es solicitar los scopes correctos: `https://www.googleapis.com/auth/spreadsheets` y `.../auth/drive.file` (o similar) para tener permisos de leer/escribir la hoja de cálculo de la app. Una vez autenticado, el token de acceso debe ser almacenado de forma segura (en memoria o en localStorage de forma cifrada si es posible). Dado que es un PWA, no hay servidor para proteger un refresh token, así que podríamos rely en el token de acceso a corto plazo y pedir re-autenticación cuando expire (o usar el token de refresco si se habilita offline access, almacenándolo en IndexedDB cifrado). Este es un detalle a considerar en seguridad.
    

**Configuración en la consola de Google Cloud:** Antes de poder usar las APIs, se configura un proyecto de Google Cloud: se habilitan **Google Sheets API** y **Google Drive API**, y se crea un OAuth Client ID de tipo Web, registrando el origen de la app (dominio) y URI de redirección si aplica. También se generará una **API Key** para la app (restringida a estos APIs) aunque con OAuth es posible que no se necesite explícitamente, algunas llamadas podrían requerirla para identificar el proyecto.

Esta integración tecnológica permite que la app sea **autónoma** sin backend. Un riesgo a mencionar: las cuotas de la API de Google. Por defecto, pueden tener límites (ej: 100 leídas por 100 segundos por usuario, etc.); sin embargo, en un uso personal esto no será un problema. Si la app escalará a muchos usuarios, se revisarían límites y quizá la necesidad de un backend proxy que use una cuenta de servicio. Pero como app personal por usuario, cada uno usa su cuota personal en su sheet.

### Plataforma Backend (futura)

Aunque la primera versión no tiene backend propio, delineamos brevemente la tecnología prevista en caso de implementarlo, para asegurar que el diseño actual lo contempla:

- **Backend en Java (Spring Boot):** Java es una elección robusta para un servidor que maneje lógica financiera. Spring Boot permitiría exponer un API REST con controladores para cada recurso (cuentas, transacciones, etc.), gestionar autenticación (posiblemente integrándose con OAuth2 as a resource server, o con su propio auth si se desvincula de Google), y conectarse a una base de datos. Se podría usar una base de datos relacional como **PostgreSQL** para almacenar transacciones, cuentas, etc. con integridad referencial y escribir consultas más complejas que las permitidas en Sheets. Además, un backend facilitaría implementar notificaciones push (via Firebase Cloud Messaging por ejemplo), coordinación de tareas programadas (via CRON jobs o Spring Scheduler) como generar informes mensuales automáticamente, y la posibilidad de integración con APIs bancarias (Open Banking) de forma segura sin exponer credenciales en el cliente.
    
- **API RESTful:** El diseño del frontend deberá estar listo para cambiar las llamadas de Google Sheets API por llamadas a un API REST propio. Por ello, encapsularemos las funciones de acceso a datos detrás de una capa de servicio en la app. Por ejemplo, en lugar de que cada componente llame directamente a Google API, habrá un módulo DataService con métodos como `getTransactions()`, `addTransaction()` que internamente ahora llaman a Google, pero que en un futuro podrán llamar a `GET /transactions` de nuestro server. Así el cambio es transparente. Esto sigue principios de buena arquitectura cliente/servidor.
    
- **Sincronización con Google:** Si se migra a backend, habría que migrar también los datos existentes del usuario de Sheets a la nueva DB. Podría hacerse que el backend inicial lea el sheet vía API de Google y lo copie a la DB la primera vez. Alternativamente, dado que Google no sería necesario post-migración, se podría ofrecer exportar/importar. En cualquier caso, se planificará minimizando la dependencia a largo plazo de Sheets una vez que haya backend.
    
- **Microservicios y escalabilidad:** No se necesita ahora, pero vale notar que un análisis de gastos intensivo podría delegarse a un microservicio separado (por ejemplo, un servicio de IA escalable). Java tiene herramientas para microservicios también (Spring Cloud, etc.). Todo esto son consideraciones futuras que no afectan la versión actual pero confirman que las tecnologías elegidas (React + un posible Java backend) son industriales y escalables.
    

### Otras tecnologías y herramientas

- **Control de versiones:** Se usará Git para el control de código fuente. Un repositorio monorepo podría contener el frontend (y backend futuro). Esto permite colaboración y seguimiento de versiones de la especificación técnica misma.
    
- **Hospedaje:** La PWA puede alojarse en GitHub Pages, Vercel, Netlify u otro servicio que sirva contenido estático sobre HTTPS (requisito para PWA). Por ejemplo, Netlify facilita incluso variables de entorno para las keys de Google. El manifiesto de PWA definirá el nombre "Cashé", los iconos (que podemos diseñar con el logo de la app) y colores.
    
- **Testing:** En cuanto a pruebas, se podrá utilizar Jest y React Testing Library para testear la lógica de componentes y quizás Cypress para pruebas end-to-end (simulando un usuario añadiendo transacciones y viendo el resultado). No es una "tecnología" visible en el producto, pero es importante para asegurar calidad en una app que manejará datos importantes del usuario.
    
- **Móvil (Android/iOS):** Gracias a ser PWA, no se requiere un SDK nativo. En Android, Chrome mostrará la opción "Añadir a inicio" cumpliendo los criterios. En iOS, Safari permite agregar PWA a la pantalla de inicio también (aunque con algunas limitaciones como sin notificaciones push de momento). Si en el futuro se quisiera publicar en tiendas de apps, se podría envolver la PWA con **Capacitor** o **Cordova**, o reusar gran parte en un proyecto React Native, pero inicialmente no es necesario.
    

## Consideraciones Técnicas Especiales

En esta sección se abordan temas transversales importantes: seguridad de la aplicación, sincronización de datos entre dispositivos, integridad de la información, funcionamiento offline (PWA) y manejo de tareas programadas, entre otros.

### Seguridad

- **Autenticación segura:** Al delegar la autenticación a Google, Cashé se beneficia de la seguridad de OAuth2. No manejamos contraseñas directamente, pero debemos proteger el token de acceso que Google nos provee. Este token será tratado como dato sensible: idealmente almacenado en **memory** o en **sessionStorage** en lugar de localStorage, para minimizar riesgos de XSS (Cross-Site Scripting) persistente. Dado que la app es un PWA servido desde un dominio propio y no ejecuta contenido de terceros, el riesgo de XSS puede controlarse con Content Security Policy estricta. Aún así, evitaremos almacenar tokens indefinidamente; quizás usemos la API de _token refresh_ de Google si disponible en JS, o pediremos re-login periódicamente (por ejemplo, cada hora de inactividad).
    
- **Scopes mínimos:** Solicitaremos los permisos mínimos necesarios. `spreadsheets` y `drive.file` (acceso a archivos creados por la app) son bastante granulares. No pediremos acceso completo a todo Drive del usuario, solo a los archivos específicos de Cashé. Esto tranquiliza al usuario de que la app no puede ver todos sus documentos.
    
- **Comunicación cifrada:** La PWA se servirá obligatoriamente sobre **HTTPS** (requisito para Service Workers y OAuth). Toda comunicación con Google APIs es sobre HTTPS también. Esto previene la interceptación de datos sensibles.
    
- **Protección de datos locales:** Puesto que la app puede funcionar offline, almacenará en el dispositivo ciertos datos (cache de transacciones, etc.). Si bien estos datos están también en Google, alguien con acceso al dispositivo y conocimiento técnico podría extraerlos. Para un nivel adicional de privacidad, se puede cifrar los datos sensibles guardados localmente (por ejemplo, en IndexedDB) usando una clave derivada de alguna credencial. Sin un backend, la única credencial del usuario es su sesión Google, pero podríamos usar el ID token (JWT) para derivar una clave. Esto quizá sea innecesariamente complejo; en general, proteger el dispositivo con PIN/biometría es responsabilidad del usuario. Eventualmente, podríamos ofrecer un _PIN de aplicación_ o bloqueo con huella para ingresar a Cashé, para que aun con el teléfono desbloqueado, los datos financieros queden protegidos. Esa funcionalidad no es prioritaria en v1 pero es una consideración futura.
    
- **Reglas de contenido y sandboxing:** Aplicaremos una Content Security Policy (CSP) que solo permita cargar scripts desde fuentes confiables (nuestro dominio, y apis.google.com para OAuth, por ejemplo). Sin eval, sin inline scripts no seguros. Esto reduce riesgo de ataques XSS.
    
- **Evitar fuga de datos a terceros:** Aparte de Google APIs, la app no debe comunicarse con otros servidores que pudieran recoger la información. No incluiremos, por ejemplo, trackers analíticos de terceros sin consentimiento. Si se desea metricar el uso, podríamos usar Google Analytics o similar, pero dado el foco en privacidad, quizás se prescinda o se haga opcional. Desde luego, cualquier integración de IA externa deberá pasar por un análisis de privacidad. Por ejemplo, no mandaríamos listados de transacciones a una API externa sin cifrado o consentimiento explícito.
    
- **Código fuente y licencias:** Al usar librerías de terceros (React, Chart.js, etc.), nos aseguraremos que tengan licencias permisivas (MIT, Apache) para evitar obligaciones legales. Además, mantendremos actualizado el software para parchear vulnerabilidades conocidas. Por ejemplo, npm audit y dependabot se usarán para vigilar paquetes vulnerables.
    
- **Seguridad en backend futuro:** Si se implementa, habrá que añadir autenticación propia o delegar la de Google (por ejemplo JWT que el frontend obtenga de Google, validado por el backend). También exponer sólo endpoints necesarios y protegerlos con auth tokens, usar HTTPS, etc. Pero esto es futuro; la especificación actual se centra en la app cliente.
    

### Sincronización entre Dispositivos

Cashé promete **sincronización total** entre dispositivos, lo que significa que un usuario debe ver la misma información actualizada ya sea que use la app en su computadora, su teléfono o tablet. En la arquitectura con Google Sheets, la sincronización se apoya en que todos esos dispositivos acceden a la misma fuente de datos en la nube (el archivo de Google Sheets). Algunos aspectos a definir:

- **Actualización al iniciar:** Cada vez que la app arranca en un dispositivo, realizará una carga inicial de datos desde Google Sheets para obtener el estado más reciente. Esto traerá todas las hojas necesarias (Cuentas, Transacciones, etc.). Para optimizar, se podrían usar las _ETags_ o metadatos de actualización que ofrece la API de Sheets; por ejemplo, la API devuelve un `updatedTime` del spreadsheet que podemos almacenar y si consultamos de nuevo podemos saber si hubo cambios. En general, comenzaremos implementando una simple recarga completa al iniciar sesión.
    
- **Sincronización en tiempo real:** Google Sheets en sí no notifica a las apps cliente cuando hay cambios (a menos que se usara la API de Google Drive push notifications, que requiere un webhook de servidor, lo cual no tenemos en frontend puro). Por tanto, la app cliente podría implementar un **polling** periódico: cada X minutos consultar si hubo modificaciones (quizás pidiendo solo ciertos rangos o contando filas). Sin embargo, esto es costo en cuotas y complejo. Dado que es improbable que un usuario esté editando en dos dispositivos simultáneamente en microtiempos, podemos optar por una estrategia más manual:
    
    - Al realizar una acción en el dispositivo A, inmediatamente reflejamos en A y enviamos a Sheets. Si el usuario luego abre dispositivo B, al iniciar obtendrá lo nuevo.
        
    - Si el usuario mantiene dos sesiones abiertas, podríamos ofrecer un botón "Sincronizar/Refrescar" que fuerza a recargar desde Sheets. También podríamos hacer que cada cierto intervalo (ej. cada 30 segundos) la app pregunte por actualizaciones, pero eso puede ser excesivo en ausencia de backend.  
        En PWA existe la _Background Sync API_ y _Periodic Sync API_, pero su soporte es limitado y en iOS no funciona. Podríamos aprovechar _Navigator.onLine_ events para cuando recobre conexión, refrescar.
        
- **Conflictos de edición:** Hay que contemplar si dos dispositivos editan a la vez. Ejemplo, usuario A en el móvil edita el monto de una transacción mientras en el portátil también edita esa transacción. Sin backend que resuelva, podría ocurrir que la última escritura sobrescriba la anterior. Con un solo usuario, la probabilidad de conflicto es baja y quizás pueda ignorarse en v1 (asumiendo que el usuario no hará cambios simultáneos en dos lugares). Pero para robustez:
    
    - Podríamos implementar control de versiones: cada transacción podría tener una marca de tiempo de última modificación. Si el usuario B intenta enviar una edición basada en una versión antigua (detectable si comparamos timestamp), la app podría avisarle "Esta transacción fue modificada en otro dispositivo, refresca antes de editar."
        
    - También se puede bloquear la edición de ciertos registros si ya están abiertos en un dispositivo (difícil sin comunicación entre ellos).  
        Sinceramente, dado el alcance personal, es aceptable aplicar la política **última escritura predomina**. Es decir, la última modificación realizada (según timestamp de Sheets, o simplemente la última que llega) será la vigente, y podría potencialmente sobrescribir un cambio concurrente. Incluir un campo "modificado en" para debugging podría ser útil.
        
- **Sincronización de datos offline:** Esto se detalla en PWA offline, pero lo mencionamos aquí: si el dispositivo A registra una transacción offline, esta queda en cola. Si antes de conectarse, el usuario en dispositivo B (que está online) hace cambios, cuando A recupere conexión, al enviar su cola, podría no tener en cuenta lo de B. Podría simplemente añadirlo. No es grave si son transacciones distintas. Si fuera la misma (editar mismo registro) hay conflicto. De nuevo, rarísimo sin multiusuario. Lo abordaremos con cautela pero sin sobreingeniería.
    

En resumen, **cada dispositivo siempre consulta la nube** al inicio y **envía cambios inmediatamente**. Adicionalmente, podríamos implementar al guardar un cambio una lectura posterior del rango modificado para confirmar. Esto aseguraría que lo que se escribió coincide, y de paso coge cualquier formula calculada por Sheets (si las hay). Por ejemplo, tras insertar transacción, leer la fila entera con formulas recalculadas (si tuviéramos formulas de saldo). Esto es más para integridad que sync.

### Integridad de Datos

Mantener la integridad significa que los datos deben permanecer coherentes y completos a pesar de operaciones simultáneas o fallidas. En Cashé, los puntos clave son:

- **Operaciones atómicas:** Algunas acciones, como vimos en Transferencias, implican múltiples cambios. Aunque Google Sheets no ofrece transacciones, utilizaremos mecanismos a nivel de aplicación para simular atomicidad. Es decir, la función que ejecuta la transferencia solo se considerará exitosa si todos los subpasos tuvieron éxito; en caso de error a mitad, deberá intentar revertir lo que hizo (por ejemplo, si insertó la salida pero falló la entrada, quizás borrar la salida o marcar inconsistente). Se puede mostrar un mensaje de error indicando que la operación no se completó y sugerir refrescar estado.
    
- **Validaciones:** La app realizará validaciones de negocio antes de enviar datos a evitar errores obvios:
    
    - No permitir transferir un monto mayor al saldo disponible en origen (para no sobregirar, salvo que se quiera permitir negativos).
        
    - No permitir montos cero o negativos donde no corresponda.
        
    - Campos obligatorios (no dejar agregar transacción sin monto o sin categoría).
        
    - Formatos de fecha válidos (usaremos probablemente Date objects y ISO strings).  
        Estas validaciones aseguran consistencia lógica.
        
- **Evitar duplicados:** Debemos evitar duplicar registros, por ejemplo, si el usuario toca dos veces el botón de agregar transacción por error. Podríamos deshabilitar el botón tras primer click hasta confirmar éxito. Y si por latencia el usuario cierra rápido, hay riesgo de duplicado. Manejar un ID único (p. ej. uuid) en cada transacción nos permite, si al insertar detectamos que ya existe esa ID (poco probable a menos que duplicó envío), no duplicar. O en caso de repetición, la app podría filtrar duplicados al leer (si dos filas tienen mismo ID, tomar una).
    
- **Consistencia referencial:** Como no hay base de datos relacional, no existen _foreign keys_, pero en la lógica de la app sí:
    
    - Si se elimina una cuenta, deberíamos decidir qué hacer con las transacciones asociadas. Quizá la app no ofrecerá eliminar cuentas que tengan transacciones históricas (en su lugar, marcar inactiva). O al eliminar una cuenta, podría preguntar si también borrar todas sus transacciones (lo cual en general no es deseable pues se pierde historial). Mejor es impedir eliminar si tiene movimientos.
        
    - Si se renombra una categoría, todas las transacciones antiguas quedan con el nombre viejo. Eso tal vez no importe, pero para integridad podría aplicarse renombre masivo (buscar y reemplazar en la columna categoría). Algo similar con cuentas.  
        Realizar estas operaciones globales con Sheets es posible (update de rango con find/replace), pero se puede posponer. En v1, se puede no permitir renombrar categorías (o solo sin histórico).
        
- **Backups/versionado:** Google Sheets tiene historial de versiones, así que el usuario podría recuperar datos borrados accidentalmente mediante la interfaz de Drive. Desde la app, podríamos ofrecer "Exportar datos" a CSV/Excel como respaldo manual. Dado que la fuente es Google, la fiabilidad es alta, pero educar al usuario a tener su backup es bueno. La integridad incluye estar protegido contra fallos catastróficos (pérdida de datos por bug); al usar Sheets, mitigamos algo ya que la data persiste en Google cloud.
    
- **Testing de cálculos:** Para integridad de cálculos (presupuestos, saldos), se realizarán pruebas con escenarios conocidos para verificar que las sumas cuadran, que no hay desfases. Ej: sumas de transacciones por cuenta vs saldo final de cuenta. Cualquier discrepancia se debe detectar. Incluso podríamos crear una hoja oculta en Sheets que calcule saldos y la app compara con su propio cálculo para ver si todo concuerda – útil en debug.
    

### Modo Offline (PWA) y Cacheo

Una de las ventajas de PWA es soportar cierto grado de uso offline. Cashé implementará capacidades offline enfocadas en **consulta de datos ya vistos** y en **registro de operaciones para sincronizar luego**, aunque con algunas limitaciones inherentes:

- **Caché de recursos estáticos:** Utilizando el Service Worker (configurado posiblemente vía Workbox), se almacenarán en caché los archivos estáticos de la aplicación (HTML, CSS, JS, imágenes de íconos) para que la app cargue incluso sin conexión. También se pueden cachéar las fuentes de Google (si se usan) y librerías, de modo que la UI básica funcione offline.
    
- **Caché de datos (último estado conocido):** Después de la primera carga exitosa, se guardarán en el almacenamiento local del dispositivo los datos financieros del usuario (p. ej., en IndexedDB o LocalStorage) para que, si abre la app offline, pueda ver la información hasta la última sincronización. Por ejemplo, la lista de transacciones y saldos que estaban vigentes. Se puede guardar un timestamp de última actualización para mostrarlo en la UI ("Datos al dd/mm/yyyy hh:mm"). Para esto, una opción cómoda es almacenar el JSON obtenido de Google Sheets (listas de objetos) en **IndexedDB**, que es adecuado para datos estructurados. IndexedDB puede usarse directamente o a través de librerías de caching (por ejemplo, Workbox tiene plugins for offline fallback).
    
- **Operaciones offline:** Si el usuario realiza acciones mientras está sin conexión (añadir transacción, editar algo), la app debería **colocar esas acciones en cola**. Esto puede ser implementado almacenando la transacción nueva en IndexedDB marcándola como "pendiente de sincronizar". El Service Worker o la propia app, al detectar que retorna la conexión (`window.ononline` event), procesará la cola: por cada operación pendiente, llamará a la API de Google Sheets para aplicar el cambio. Si todos van bien, marca como completado y quita de la cola. Si hay un error (por ejemplo, la API rechaza por algún motivo), se notifica al usuario y se deja en cola o en estado error para intervención manual.
    
- **Limitaciones offline:** Obviamente, el usuario no podrá ver datos que nunca haya cargado (si abre por primera vez sin conexión, la app no tendrá nada que mostrar). Tampoco podrá ver actualizaciones hechas desde otro dispositivo mientras estuvo offline hasta reconectar. Pero la idea es que pueda al menos registrar gastos en el momento (ej: está en un lugar sin señal pero quiere anotar un gasto en efectivo) y luego se sincronizarán.
    
- **UI Indicativa:** Es importante en la UI indicar el estado de conectividad/sincronización. Por ejemplo, un ícono o texto "Offline" cuando no hay conexión, y/o un indicador de sincronizando cuando está enviando colas. Esto para que el usuario comprenda que la acción será diferida. También quizás listar las transacciones en cola en alguna parte (por ejemplo, mostrarlas atenuadas con un icono reloj).
    
- **Cache expiration:** Los datos financieros cambian con frecuencia por las acciones del usuario, pero aún así podríamos definir que la caché de datos expire después de, por ejemplo, una semana sin conexión, para evitar mostrar datos muy antiguos que podrían ser engañosos. Esto es sutil; en general confiaremos en la última data hasta que pueda actualizar.
    
- **Notificaciones push offline:** En la primera versión, es poco probable implementar notificaciones push (ya que requiere backend o Firebase). Sin embargo, si se quisiera recordar pagos aunque el usuario no abra la app, se tendría que usar push. En iOS PWA no hay soporte, en Android sí con service worker + FCM. Esto requeriría un servidor (FCM requires a server key to send messages to the client). Así que pospondremos push notifications a cuando exista backend. Mientras tanto, las "notificaciones" serán mostradas in-app en el Dashboard cuando el usuario abra la app.
    

En suma, Cashé como PWA ofrecerá una **experiencia offline razonable**: visualizar datos existentes y capturar nuevos datos para sincronizar más tarde. Esto agrega robustez y asimila la funcionalidad a la de apps nativas que pueden operar sin internet momentáneamente.

### Tareas Programadas y Automatizaciones

El manejo de **tareas programadas** se refiere a eventos o acciones que deben ocurrir en momentos específicos sin intervención directa del usuario. En el contexto de Cashé, destacan:

- **Transacciones recurrentes:** Muchos gastos o ingresos son periódicos (salario mensual, renta, suscripciones, etc.). La app debería permitir marcar una transacción como recurrente (ej. repetición mensual el día 5, o semanal cada lunes). Una vez configurado, se espera que esas transacciones se generen automáticamente en las fechas correspondientes. Sin un backend siempre corriendo, esto es un reto. Posibles enfoques:
    
    - **Recordatorios al usuario:** Una aproximación simple es, en lugar de auto insertar, notificar al usuario el día que toca la transacción recurrente: "Hoy vence pagar X, click para añadir". Dado que implementar un cron en el frontend es inviable (la app no corre si no está abierta), se podría delegar en _servicios de Google_. Por ejemplo, **Google Apps Script**: podríamos adjuntar un pequeño script al Google Sheet del usuario que, mediante un trigger de tiempo (Apps Script permite triggers horarios, diarios, etc.), ejecute y añada la fila en la sheet cuando corresponda. Esto requiere insertar un script en el sheet (lo cual la API de Drive permite, o el usuario manualmente). Tiene la ventaja que corre en la nube de Google sin mantener servidores. La desventaja es mayor complejidad en set up y que el script de Apps Script tendría que conocer la lógica de nuestras transacciones (podemos guardarle en otra hoja config de recurrentes).
        
    - **Uso de Service Worker Periodic Sync:** Chrome tiene una API experimental de _Periodic Background Sync_ que permite a la PWA despertarse a intervalos para tareas. Si estuviera disponible, podríamos programar uno diario que revisa "¿hay transacciones recurrentes para hoy?" en la caché y las añade. Sin embargo, su soporte es limitado y no fiable en todos dispositivos.
        
    - **Futuro backend:** Obviamente, con un backend sería trivial: un cron job diario que chequea y crea transacciones.
        
    
    Para la primera versión, optaremos por implementar la funcionalidad de recurrentes de forma _semi-automática_: se permitirá al usuario marcar transacciones como recurrentes y la app almacenará esa meta-información (por ejemplo, en la columna Recurrente de la hoja Transacciones o en una hoja "Recurrentes" listando plantilla de transacción y periodicidad). Luego, cada vez que el usuario abra la aplicación, el módulo Finanzas podrá checar si desde la última vez que abrió hasta hoy hay alguna transacción recurrente pendiente de crear (ej. si no abrió en 10 días y en ese lapso pasó un evento recurrente, lo detecta). Si encuentra pendientes, puede generar esas transacciones automáticamente en ese momento (o solicitando confirmación). De este modo, mientras el usuario abra la app con cierta frecuencia, las recurrencias se respetarán. No es en rigor una tarea cronometrada exacta, pero para la mayoría de casos es suficiente. Documentaremos esta limitación claramente en la ayuda al usuario.
    
- **Alertas de pagos y fechas límite:** Similar a lo anterior, por ejemplo la fecha de pago de una tarjeta de crédito. Podríamos implementar un mecanismo que, al abrir la app, avise con X días de antelación. Sin backend/push, dependemos de la apertura. Alternativa: enviar un correo desde Google Apps Script en la fecha (Apps Script puede enviar emails). Podría ser útil si el usuario lo habilita. Pero mantendremos las alertas in-app al inicio por ahora.
    
- **Generación de informes:** Podría ser útil crear un informe PDF o enviar un correo resumen de fin de mes automáticamente. Sin backend, nuevamente Apps Script en la sheet es la opción: un trigger end of month que compile datos y envíe mail. Esto es un plus que podríamos habilitar opcionalmente (con una plantilla de Apps Script prehecha que el usuario copia). No lo implementaremos por defecto en v1, pero es factible.
    
- **Sincronización de tipo externo:** Si en el futuro conectamos APIs bancarias (ej. vía Plaid u otros), podríamos querer sincronizar transacciones desde bancos automáticamente cada cierto tiempo. Por ahora, no aplica ya que todo es manual. De nuevo, señalar que backend facilitría eso.
    
- **Mantenimiento de datos:** Con el tiempo, la hoja de cálculo crecerá. Aunque Google Sheets soporta hasta 5 millones de celdas, quizás se quiera archivar transacciones antiguas (ej. más de X años) para aligerar. Una tarea programada anual podría mover datos viejos a otra hoja de archivo. Sin backend, el usuario tendría que hacerlo manual o con script. No es crítico en la etapa inicial dado el volumen personal.
    

En conclusión, las **automatizaciones** en la primera versión se implementarán principalmente cuando la aplicación esté activa (a través de verificaciones al inicio) y se explorará el uso de Google Apps Script para lograr verdadera automatización en segundo plano aprovechando la plataforma Google. Documentaremos claramente estas dependencias. Conforme la aplicación evolucione (especialmente si se añade un backend), estas tareas programadas se migrarán a un servicio siempre activo para total confiabilidad.

## Requisitos de Interfaz e Interacción con el Usuario

Finalmente, especificamos ciertos **requisitos de UI/UX** que deberán tenerse en cuenta al diseñar e implementar la interfaz de Cashé, para asegurar que la aplicación sea agradable de usar y accesible a una audiencia amplia.

- **Claridad y simplicidad:** Aunque el documento es técnico, la aplicación en sí estará orientada a usuarios no técnicos. La interfaz debe presentarse limpia, con terminología sencilla (ej. usar "Gastos" en lugar de "Débitos" si fuera más comprensible, etc.), en el idioma del usuario. Cada módulo debe ser accesible mediante un menú claro; se podría usar una barra de navegación con iconos y etiquetas: _Dashboard_, _Transacciones_, _Cuentas_, _Tarjetas_, _Más..._. Agrupar lógicamente: quizás _Transacciones_ y _Transferencias_ vayan juntas bajo "Finanzas". Estas decisiones se pueden validar con usuarios de prueba.
    
- **Modo oscuro:** Como mencionado en tecnologías, Cashé soportará modo claro y oscuro. El diseño gráfico deberá contemplar paletas de color para ambos modos, asegurando contraste suficiente (por ejemplo, en modo oscuro usar grises oscuros, texto claro, y colores de acento adaptados). El usuario podrá elegir manualmente el modo en ajustes, o seleccionar "Automático" para seguir la configuración del sistema operativo. Este cambio debe ser dinámico sin necesidad de reiniciar la app. Cada componente (gráficos, tablas) tomará los colores del tema actual. Por ejemplo, en modo oscuro, los gráficos podrían tener fondo negro translúcido y colores más vibrantes para categorías; en modo claro, fondo blanco y colores más saturados. La consistencia es clave: se evitará que elementos queden con fondo blanco en modo oscuro por olvido, etc.
    
- **Soporte multidioma:** La aplicación estará preparada para múltiples idiomas desde el inicio. El español será probablemente el idioma base (dado el enunciado), pero se debe facilitar la traducción a inglés y otros lenguajes. Técnicamente, esto significa externalizar todas las cadenas de texto de la UI a archivos de localización (por ejemplo, formato JSON o YAML con keys y traducciones). Usando React, se puede integrar **react-i18next** o similar para manejar la internacionalización. Además de textos de interfaz, se adaptarán formatos: fecha y moneda según la localización del usuario. Por ejemplo, en español usar formato de fecha día/mes/año y separadores de miles con punto, mientras en inglés sería mes/día/año y separadores invertidos. Podríamos emplear la API Intl de JavaScript para formateos locales de moneda (NumberFormat). El switch de idioma estará en ajustes, permitiendo cambiar on-the-fly. Un desafío a considerar es la **dirección del texto**: si se piensa en expandir a idiomas RTL (árabe/hebreo), habría que ver compatibilidad de CSS; pero inicialmente, con español/inglés se mantiene LTR.
    
- **Diseño de interacción (UX):** Se priorizará una curva de aprendizaje suave. Por ejemplo, la primera vez que el usuario abre la app, se le puede mostrar un breve **tutorial de onboarding** (un par de slides explicando cómo agregar un gasto, etc.). Durante el uso, se usarán ayudas contextuales (iconos de información que al tocar/hover explican brevemente funcionalidades, tooltips). Importante también es brindar **feedback inmediato** a las acciones: si el usuario agrega un gasto, mostrar quizás un mensaje "✓ Gasto registrado" o resaltar la nueva entrada en la lista; si algo tarda (como sincronizando con Google), mostrar un indicador de cargando; si hay error, mensaje claro. Nunca dejar al usuario preguntándose si su acción funcionó.
    
- **Gestión de errores de usuario:** Validaciones en formularios deben acompañarse de mensajes claros. Ej: "El monto no es válido" si ponen texto en campo de número, etc., idealmente in situ junto al campo.
    
- **Navegación fluida:** Implementar flujos comunes con la menor fricción: agregar transacción en el menor número de toques posible, editar cuentas directamente desde la lista, etc. Aprovechar características de dispositivo: quizás permitir agregar gasto vía un **widget** o acceso directo (PWA permite algunas acciones en el icono con manifest shortcuts). Por ejemplo, manifest JSON puede definir shortcuts como "Nueva transacción" que abre directamente la pantalla correspondiente. Esto mejora la UX para usuarios frecuentes.
    
- **Accesibilidad:** Asegurarse que la app sea usable por personas con discapacidades es parte de los objetivos. Usando componentes estandarizados (Material UI por ejemplo ya cubre bastante ARIA roles). Nos aseguraremos de proveer etiquetas alt en iconos, descripciones en gráficos (por ejemplo, gráficos complejos podrían tener un toggle para mostrar tabla de datos para lectores de pantalla). El contraste de colores será verificado. También consideraremos tamaños de letra ajustables (quizá usando `rem` units para que en configuraciones de fuente grande del dispositivo, la app se escale).
    
- **Calendario de gastos (interacción):** La vista calendario merece atención. Debe ser navegable mes a mes, quizás con flechas o swipe. Al tocar un día, mostrar lista de gastos de ese día (posiblemente en un popup o panel lateral). Los días sin gastos se muestran vacíos o con "0". Días con muchos gastos pueden tener un pequeño indicador (ej. punto o color de fondo). Esta interacción debe ser fluida y consistente con el resto de la app.
    
- **Confirmaciones y prevención de pérdidas:** Cualquier acción destructiva (como eliminar transacción, eliminar cuenta) pedirá confirmación del usuario ("¿Seguro que deseas eliminar...?"). Además, es útil permitir "deshacer" en ciertos casos. Un patrón moderno es un snackbar con "Gasto eliminado – DESHACER" que da 5 segundos para revertir. Esto podría ser implementado para mejorar UX.
    
- **Rendimiento percibido:** La app debe sentirse rápida. Pre-cargar en segundo plano datos del dashboard mientras el usuario ve otra sección, por ejemplo. Usar spinners sólo cuando necesario. Minimizar saltos de diseño (layout shifts). Para grandes listas (transacciones históricas), usar técnicas virtualizadas si la cantidad es enorme, aunque improbable en personal finance (miles de registros anuales, React puede manejarlo, pero estar conscientes).
    
- **Branding y estética:** Cashé debería tener una identidad visual agradable. Elegir una paleta de colores que inspire finanzas personales (verdes, azules para confianza, quizás un color de acento vibrante para resaltar). Diseñar un logo simple, posiblemente relacionado con el nombre (que sugiere "cash" y "caché"). Esto no es puramente técnico, pero un buen diseño aumenta adopción. Los elementos visuales innovadores (gráficos) también contribuyen a esto, haciéndola ver moderna y útil.
    

En síntesis, la interfaz de Cashé se construirá siguiendo las mejores prácticas de UX/UI para garantizar que, pese a ser una especificación técnica orientada a desarrolladores, el resultado final sea una aplicación que cualquier persona pueda usar sin dificultad. Al documentar estos requisitos de interfaz claramente, los desarrolladores (o asistentes de desarrollo IA) tendrán una guía de cómo debe comportarse y sentirse la aplicación, asegurando que la implementación técnica cumpla con las expectativas del usuario final.

### Bot de Whatsapp para cargar transacciones

## Conclusión

Esta especificación técnica ha detallado la visión completa de Cashé, una aplicación modular de finanzas personales, desde su arquitectura basada en PWA y Google Sheets, pasando por la descripción funcional y técnica de cada módulo, la selección cuidadosa de tecnologías para llevarla a cabo, hasta las consideraciones de seguridad, sincronización y experiencia de usuario necesarias para un producto sólido.

Con esta guía, un equipo de desarrollo (humano o asistido por IA) debería contar con un mapa claro para construir la primera versión de Cashé. Es un proyecto ambicioso que combina la agilidad de las herramientas actuales (PWA, servicios en la nube) con la promesa de escalabilidad futura (backend dedicado, IA avanzada). Al mantenerse la redacción clara y estructurada, este documento puede ser compartido y entendido tanto por desarrolladores (que encontrarán detalles técnicos y referencias) como por interesados no técnicos (que apreciarán las descripciones de funcionalidades y principios de diseño en lenguaje llano).

Cashé busca empoderar al usuario sobre sus finanzas, y esta especificación es el cimiento para convertir esa idea en una aplicación real y funcional. Con los módulos definidos, las tecnologías seleccionadas y las pautas de UX establecidas, el siguiente paso es proceder al desarrollo iterativo, validando cada componente contra estos lineamientos y ajustando según feedback, para finalmente entregar una herramienta innovadora de gestión financiera personal.

**Referencias:** _Al desarrollar este documento se han tomado en cuenta mejores prácticas y casos de uso existentes, por ejemplo, aplicaciones financieras PWA que utilizan Google Sheets como base de datos, el empleo de librerías como React y Chart.js en apps de finanzas personales, así como tendencias de IA en finanzas para funcionalidades como predicciones y automatización. Estas referencias apoyan las decisiones técnicas propuestas y sirven como guía comparativa._