/**
 * Catálogo de emojis organizados por categorías
 * Optimizado para categorías de finanzas personales
 */

export const EMOJI_CATEGORIES = [
  {
    id: 'dinero',
    name: 'Dinero',
    emojis: [
      { emoji: '💰', keywords: ['dinero', 'money', 'bolsa', 'plata'] },
      { emoji: '💵', keywords: ['billete', 'dolar', 'efectivo', 'cash'] },
      { emoji: '💴', keywords: ['yen', 'billete', 'japon'] },
      { emoji: '💶', keywords: ['euro', 'billete', 'europa'] },
      { emoji: '💷', keywords: ['libra', 'billete', 'uk'] },
      { emoji: '💸', keywords: ['dinero', 'volando', 'gasto'] },
      { emoji: '💳', keywords: ['tarjeta', 'credito', 'debito', 'card'] },
      { emoji: '🪙', keywords: ['moneda', 'coin', 'crypto'] },
      { emoji: '💎', keywords: ['diamante', 'lujo', 'valioso'] },
      { emoji: '🏦', keywords: ['banco', 'bank', 'edificio'] },
      { emoji: '🏧', keywords: ['cajero', 'atm', 'banco'] },
      { emoji: '💹', keywords: ['grafico', 'acciones', 'subida'] },
      { emoji: '📈', keywords: ['grafico', 'subida', 'crecimiento', 'inversion'] },
      { emoji: '📉', keywords: ['grafico', 'bajada', 'perdida'] },
      { emoji: '🧾', keywords: ['recibo', 'factura', 'ticket'] },
      { emoji: '💲', keywords: ['dolar', 'signo', 'precio'] },
      { emoji: '₿', keywords: ['bitcoin', 'crypto', 'btc'] },
    ]
  },
  {
    id: 'comida',
    name: 'Comida',
    emojis: [
      { emoji: '🍔', keywords: ['hamburguesa', 'burger', 'comida rapida'] },
      { emoji: '🍕', keywords: ['pizza', 'comida'] },
      { emoji: '🍟', keywords: ['papas', 'fries', 'comida rapida'] },
      { emoji: '🌮', keywords: ['taco', 'mexicano'] },
      { emoji: '🌯', keywords: ['burrito', 'wrap'] },
      { emoji: '🥗', keywords: ['ensalada', 'salad', 'saludable'] },
      { emoji: '🍣', keywords: ['sushi', 'japones'] },
      { emoji: '🍜', keywords: ['ramen', 'sopa', 'fideos'] },
      { emoji: '🍝', keywords: ['pasta', 'espagueti', 'italiano'] },
      { emoji: '🥘', keywords: ['guiso', 'paella', 'cocina'] },
      { emoji: '🍖', keywords: ['carne', 'asado', 'meat'] },
      { emoji: '🥩', keywords: ['bife', 'carne', 'steak'] },
      { emoji: '🍗', keywords: ['pollo', 'chicken'] },
      { emoji: '🥐', keywords: ['croissant', 'panaderia', 'desayuno'] },
      { emoji: '🍞', keywords: ['pan', 'bread', 'panaderia'] },
      { emoji: '🧁', keywords: ['cupcake', 'postre', 'dulce'] },
      { emoji: '🍰', keywords: ['torta', 'cake', 'postre'] },
      { emoji: '🍦', keywords: ['helado', 'ice cream', 'postre'] },
      { emoji: '🍩', keywords: ['dona', 'donut', 'dulce'] },
      { emoji: '☕', keywords: ['cafe', 'coffee', 'bebida'] },
      { emoji: '🍺', keywords: ['cerveza', 'beer', 'alcohol'] },
      { emoji: '🍷', keywords: ['vino', 'wine', 'alcohol'] },
      { emoji: '🛒', keywords: ['super', 'supermercado', 'compras', 'carrito'] },
      { emoji: '🛍️', keywords: ['bolsas', 'compras', 'shopping'] },
    ]
  },
  {
    id: 'transporte',
    name: 'Transporte',
    emojis: [
      { emoji: '🚗', keywords: ['auto', 'carro', 'car', 'vehiculo'] },
      { emoji: '🚕', keywords: ['taxi', 'uber', 'cabify'] },
      { emoji: '🚌', keywords: ['colectivo', 'bus', 'bondi'] },
      { emoji: '🚇', keywords: ['subte', 'metro', 'tren'] },
      { emoji: '🚂', keywords: ['tren', 'train', 'ferrocarril'] },
      { emoji: '✈️', keywords: ['avion', 'vuelo', 'viaje', 'aerolinea'] },
      { emoji: '🛫', keywords: ['despegue', 'vuelo', 'aeropuerto'] },
      { emoji: '🚀', keywords: ['cohete', 'rapido', 'space'] },
      { emoji: '🚲', keywords: ['bici', 'bicicleta', 'bike'] },
      { emoji: '🛵', keywords: ['moto', 'scooter', 'delivery'] },
      { emoji: '🏍️', keywords: ['moto', 'motorcycle'] },
      { emoji: '⛽', keywords: ['nafta', 'combustible', 'gas', 'gasolina'] },
      { emoji: '🅿️', keywords: ['parking', 'estacionamiento'] },
      { emoji: '🚏', keywords: ['parada', 'colectivo', 'bus stop'] },
      { emoji: '⛴️', keywords: ['barco', 'ferry', 'buquebus'] },
    ]
  },
  {
    id: 'hogar',
    name: 'Hogar',
    emojis: [
      { emoji: '🏠', keywords: ['casa', 'home', 'hogar'] },
      { emoji: '🏡', keywords: ['casa', 'jardin', 'home'] },
      { emoji: '🏢', keywords: ['edificio', 'oficina', 'building'] },
      { emoji: '🛋️', keywords: ['sofa', 'muebles', 'living'] },
      { emoji: '🛏️', keywords: ['cama', 'dormitorio', 'bed'] },
      { emoji: '🚿', keywords: ['ducha', 'baño', 'shower'] },
      { emoji: '🛁', keywords: ['bañera', 'baño', 'bath'] },
      { emoji: '💡', keywords: ['luz', 'electricidad', 'lamp'] },
      { emoji: '🔌', keywords: ['electricidad', 'enchufe', 'plug'] },
      { emoji: '📺', keywords: ['tv', 'television', 'tele'] },
      { emoji: '🧹', keywords: ['limpieza', 'escoba', 'cleaning'] },
      { emoji: '🧺', keywords: ['lavanderia', 'ropa', 'laundry'] },
      { emoji: '🔧', keywords: ['herramienta', 'reparacion', 'tool'] },
      { emoji: '🔨', keywords: ['martillo', 'reparacion', 'construccion'] },
      { emoji: '🪴', keywords: ['planta', 'jardin', 'maceta'] },
      { emoji: '🌡️', keywords: ['temperatura', 'gas', 'calefaccion'] },
      { emoji: '💧', keywords: ['agua', 'water', 'servicio'] },
      { emoji: '🔥', keywords: ['fuego', 'gas', 'calefaccion'] },
    ]
  },
  {
    id: 'entretenimiento',
    name: 'Entretenimiento',
    emojis: [
      { emoji: '🎬', keywords: ['cine', 'pelicula', 'movie'] },
      { emoji: '🎮', keywords: ['videojuego', 'gaming', 'game'] },
      { emoji: '🎧', keywords: ['musica', 'auriculares', 'spotify'] },
      { emoji: '🎵', keywords: ['musica', 'music', 'cancion'] },
      { emoji: '🎤', keywords: ['karaoke', 'microfono', 'concierto'] },
      { emoji: '🎸', keywords: ['guitarra', 'musica', 'rock'] },
      { emoji: '🎭', keywords: ['teatro', 'show', 'espectaculo'] },
      { emoji: '🎪', keywords: ['circo', 'evento', 'show'] },
      { emoji: '🎯', keywords: ['dardos', 'juego', 'objetivo'] },
      { emoji: '🎲', keywords: ['dados', 'juego', 'casino'] },
      { emoji: '🎰', keywords: ['casino', 'tragamonedas', 'juego'] },
      { emoji: '📚', keywords: ['libros', 'lectura', 'books'] },
      { emoji: '📖', keywords: ['libro', 'lectura', 'book'] },
      { emoji: '🎨', keywords: ['arte', 'pintura', 'creative'] },
      { emoji: '🎁', keywords: ['regalo', 'gift', 'presente'] },
      { emoji: '🎉', keywords: ['fiesta', 'party', 'celebracion'] },
      { emoji: '🎊', keywords: ['confeti', 'fiesta', 'celebracion'] },
      { emoji: '📱', keywords: ['celular', 'telefono', 'app'] },
      { emoji: '💻', keywords: ['computadora', 'laptop', 'pc'] },
      { emoji: '🖥️', keywords: ['monitor', 'desktop', 'pc'] },
    ]
  },
  {
    id: 'salud',
    name: 'Salud',
    emojis: [
      { emoji: '💊', keywords: ['medicamento', 'pastilla', 'farmacia'] },
      { emoji: '💉', keywords: ['vacuna', 'inyeccion', 'medico'] },
      { emoji: '🏥', keywords: ['hospital', 'clinica', 'salud'] },
      { emoji: '🩺', keywords: ['medico', 'doctor', 'consulta'] },
      { emoji: '🩹', keywords: ['curita', 'herida', 'bandaid'] },
      { emoji: '🧴', keywords: ['crema', 'locion', 'farmacia'] },
      { emoji: '🦷', keywords: ['diente', 'dentista', 'odontologia'] },
      { emoji: '👓', keywords: ['anteojos', 'lentes', 'optica'] },
      { emoji: '🧘', keywords: ['yoga', 'meditacion', 'wellness'] },
      { emoji: '💪', keywords: ['gimnasio', 'gym', 'ejercicio', 'fitness'] },
      { emoji: '🏋️', keywords: ['pesas', 'gimnasio', 'gym'] },
      { emoji: '🧠', keywords: ['mente', 'psicologia', 'terapia'] },
      { emoji: '❤️', keywords: ['corazon', 'salud', 'amor'] },
      { emoji: '🩻', keywords: ['rayos x', 'radiografia', 'estudio'] },
    ]
  },
  {
    id: 'educacion',
    name: 'Educación',
    emojis: [
      { emoji: '📚', keywords: ['libros', 'estudio', 'universidad'] },
      { emoji: '🎓', keywords: ['graduacion', 'universidad', 'titulo'] },
      { emoji: '🏫', keywords: ['escuela', 'colegio', 'school'] },
      { emoji: '📝', keywords: ['apuntes', 'nota', 'escribir'] },
      { emoji: '✏️', keywords: ['lapiz', 'escribir', 'estudio'] },
      { emoji: '📐', keywords: ['regla', 'geometria', 'matematica'] },
      { emoji: '🔬', keywords: ['microscopio', 'ciencia', 'lab'] },
      { emoji: '🧪', keywords: ['quimica', 'laboratorio', 'ciencia'] },
      { emoji: '💼', keywords: ['trabajo', 'maletin', 'oficina'] },
      { emoji: '🖊️', keywords: ['lapicera', 'escribir', 'firma'] },
      { emoji: '📓', keywords: ['cuaderno', 'notas', 'apuntes'] },
      { emoji: '🌐', keywords: ['internet', 'web', 'curso online'] },
    ]
  },
  {
    id: 'ropa',
    name: 'Ropa y Belleza',
    emojis: [
      { emoji: '👕', keywords: ['remera', 'camiseta', 'ropa'] },
      { emoji: '👖', keywords: ['pantalon', 'jeans', 'ropa'] },
      { emoji: '👗', keywords: ['vestido', 'dress', 'ropa'] },
      { emoji: '👔', keywords: ['camisa', 'formal', 'trabajo'] },
      { emoji: '👟', keywords: ['zapatillas', 'sneakers', 'calzado'] },
      { emoji: '👠', keywords: ['tacos', 'zapatos', 'calzado'] },
      { emoji: '👜', keywords: ['cartera', 'bolso', 'bag'] },
      { emoji: '🎒', keywords: ['mochila', 'backpack', 'bolso'] },
      { emoji: '👒', keywords: ['sombrero', 'hat', 'accesorio'] },
      { emoji: '🧥', keywords: ['campera', 'abrigo', 'jacket'] },
      { emoji: '💄', keywords: ['labial', 'maquillaje', 'makeup'] },
      { emoji: '💅', keywords: ['uñas', 'manicura', 'belleza'] },
      { emoji: '💇', keywords: ['peluqueria', 'corte', 'pelo'] },
      { emoji: '🧴', keywords: ['shampoo', 'crema', 'higiene'] },
      { emoji: '👙', keywords: ['bikini', 'playa', 'ropa'] },
      { emoji: '🩱', keywords: ['traje de baño', 'pileta', 'natacion'] },
    ]
  },
  {
    id: 'mascotas',
    name: 'Mascotas',
    emojis: [
      { emoji: '🐕', keywords: ['perro', 'dog', 'mascota'] },
      { emoji: '🐈', keywords: ['gato', 'cat', 'mascota'] },
      { emoji: '🐦', keywords: ['pajaro', 'bird', 'mascota'] },
      { emoji: '🐠', keywords: ['pez', 'fish', 'pecera'] },
      { emoji: '🐹', keywords: ['hamster', 'mascota', 'roedor'] },
      { emoji: '🐰', keywords: ['conejo', 'rabbit', 'mascota'] },
      { emoji: '🦎', keywords: ['lagartija', 'reptil', 'mascota'] },
      { emoji: '🐾', keywords: ['huella', 'mascota', 'veterinaria'] },
      { emoji: '🦴', keywords: ['hueso', 'perro', 'mascota'] },
    ]
  },
  {
    id: 'viajes',
    name: 'Viajes',
    emojis: [
      { emoji: '🏖️', keywords: ['playa', 'beach', 'vacaciones'] },
      { emoji: '🏔️', keywords: ['montaña', 'mountain', 'turismo'] },
      { emoji: '🏕️', keywords: ['camping', 'carpa', 'naturaleza'] },
      { emoji: '🗼', keywords: ['torre', 'paris', 'turismo'] },
      { emoji: '🗽', keywords: ['estatua', 'new york', 'turismo'] },
      { emoji: '🏰', keywords: ['castillo', 'disney', 'turismo'] },
      { emoji: '🌴', keywords: ['palmera', 'tropical', 'vacaciones'] },
      { emoji: '🧳', keywords: ['valija', 'equipaje', 'viaje'] },
      { emoji: '🗺️', keywords: ['mapa', 'viaje', 'turismo'] },
      { emoji: '🏨', keywords: ['hotel', 'alojamiento', 'hospedaje'] },
      { emoji: '⛱️', keywords: ['sombrilla', 'playa', 'vacaciones'] },
      { emoji: '🎿', keywords: ['ski', 'nieve', 'invierno'] },
    ]
  },
  {
    id: 'trabajo',
    name: 'Trabajo',
    emojis: [
      { emoji: '💼', keywords: ['maletin', 'trabajo', 'oficina', 'business'] },
      { emoji: '🏢', keywords: ['edificio', 'oficina', 'empresa'] },
      { emoji: '💻', keywords: ['laptop', 'trabajo', 'remoto'] },
      { emoji: '📊', keywords: ['grafico', 'presentacion', 'reporte'] },
      { emoji: '📋', keywords: ['clipboard', 'lista', 'tareas'] },
      { emoji: '📁', keywords: ['carpeta', 'archivos', 'folder'] },
      { emoji: '🖨️', keywords: ['impresora', 'printer', 'oficina'] },
      { emoji: '📤', keywords: ['enviar', 'email', 'send'] },
      { emoji: '📥', keywords: ['recibir', 'inbox', 'download'] },
      { emoji: '✅', keywords: ['check', 'completado', 'tarea'] },
      { emoji: '📆', keywords: ['calendario', 'agenda', 'fecha'] },
      { emoji: '⏰', keywords: ['reloj', 'alarma', 'tiempo'] },
    ]
  },
  {
    id: 'otros',
    name: 'Otros',
    emojis: [
      { emoji: '⭐', keywords: ['estrella', 'favorito', 'star'] },
      { emoji: '🔔', keywords: ['campana', 'notificacion', 'bell'] },
      { emoji: '📌', keywords: ['pin', 'marcador', 'importante'] },
      { emoji: '🔖', keywords: ['marcador', 'bookmark', 'etiqueta'] },
      { emoji: '🏷️', keywords: ['etiqueta', 'tag', 'precio'] },
      { emoji: '🔐', keywords: ['candado', 'seguridad', 'lock'] },
      { emoji: '📞', keywords: ['telefono', 'llamada', 'phone'] },
      { emoji: '✉️', keywords: ['sobre', 'mail', 'correo'] },
      { emoji: '🗓️', keywords: ['calendario', 'fecha', 'evento'] },
      { emoji: '⚡', keywords: ['rayo', 'energia', 'rapido'] },
      { emoji: '🌟', keywords: ['brillante', 'especial', 'destacado'] },
      { emoji: '❓', keywords: ['pregunta', 'duda', 'question'] },
      { emoji: '❗', keywords: ['importante', 'atencion', 'warning'] },
      { emoji: '➕', keywords: ['mas', 'agregar', 'plus'] },
      { emoji: '➖', keywords: ['menos', 'quitar', 'minus'] },
      { emoji: '🔄', keywords: ['actualizar', 'refresh', 'sync'] },
      { emoji: '♻️', keywords: ['reciclar', 'ecologia', 'verde'] },
      { emoji: '🎯', keywords: ['objetivo', 'meta', 'target'] },
    ]
  }
];

/**
 * Obtiene todos los emojis como lista plana
 */
export const getAllEmojis = () => {
  return EMOJI_CATEGORIES.flatMap(category =>
    category.emojis.map(e => ({
      ...e,
      category: category.name
    }))
  );
};

/**
 * Busca emojis por término
 */
export const searchEmojis = (searchTerm) => {
  if (!searchTerm) return getAllEmojis();

  const term = searchTerm.toLowerCase().trim();
  return getAllEmojis().filter(emoji =>
    emoji.keywords.some(keyword => keyword.includes(term)) ||
    emoji.emoji === term
  );
};

export default EMOJI_CATEGORIES;
