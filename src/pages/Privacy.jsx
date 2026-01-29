export default function Privacy() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Política de Privacidad</h1>
        <p className="text-zinc-400 mb-8">Última actualización: Enero 2026</p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">1. Información que recopilamos</h2>
          <p className="text-zinc-300 mb-4">
            Cashé recopila la siguiente información para brindarte el servicio:
          </p>
          <ul className="list-disc list-inside text-zinc-300 space-y-2 ml-4">
            <li>Información de tu cuenta de Google (nombre, email, foto de perfil) cuando iniciás sesión</li>
            <li>Datos financieros que ingresás voluntariamente (cuentas, categorías, movimientos)</li>
            <li>Tu número de WhatsApp si decidís vincular el bot</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">2. Cómo usamos tu información</h2>
          <p className="text-zinc-300 mb-4">
            Usamos tu información exclusivamente para:
          </p>
          <ul className="list-disc list-inside text-zinc-300 space-y-2 ml-4">
            <li>Permitirte acceder a tu cuenta</li>
            <li>Guardar y mostrar tus datos financieros</li>
            <li>Procesar mensajes del bot de WhatsApp</li>
            <li>Mejorar el servicio</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">3. Almacenamiento de datos</h2>
          <p className="text-zinc-300">
            Tus datos se almacenan de forma segura en Supabase, con encriptación en tránsito y en reposo.
            No compartimos tu información con terceros, excepto los servicios necesarios para operar
            (Supabase para la base de datos, Meta para WhatsApp).
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">4. Bot de WhatsApp</h2>
          <p className="text-zinc-300">
            Si vinculás tu cuenta con WhatsApp, procesamos los mensajes que enviás al bot para
            registrar movimientos y responder consultas. No almacenamos el contenido de los mensajes
            más allá de lo necesario para procesar cada solicitud.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">5. Tus derechos</h2>
          <p className="text-zinc-300 mb-4">
            Tenés derecho a:
          </p>
          <ul className="list-disc list-inside text-zinc-300 space-y-2 ml-4">
            <li>Acceder a todos tus datos desde la app</li>
            <li>Eliminar tu cuenta y todos los datos asociados</li>
            <li>Desvincular WhatsApp en cualquier momento</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">6. Contacto</h2>
          <p className="text-zinc-300">
            Si tenés preguntas sobre esta política, podés contactarnos en{' '}
            <a href="mailto:juanmalosada01@gmail.com" className="text-teal-400 hover:underline">
              juanmalosada01@gmail.com
            </a>
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">7. Cambios a esta política</h2>
          <p className="text-zinc-300">
            Podemos actualizar esta política ocasionalmente. Te notificaremos de cambios significativos
            a través de la app.
          </p>
        </section>

        <div className="mt-12 pt-8 border-t border-zinc-800">
          <a href="/" className="text-teal-400 hover:underline">← Volver a Cashé</a>
        </div>
      </div>
    </div>
  )
}
