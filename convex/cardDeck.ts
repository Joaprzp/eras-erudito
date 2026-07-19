/**
 * Mazo privado transcrito a partir de tarjetas físicas aportadas por el dueño
 * del proyecto. No se publica ni se reutiliza fuera de este MVP familiar.
 */
export type CardCategory = 'sequence' | 'association' | 'common' | 'approximation'

export type SequenceCard = {
  category: 'sequence'
  id: string
  instruction: string
  items: string[]
  correctOrder: string[]
}

export type AssociationCard = {
  category: 'association'
  id: string
  instruction: string
  leftItems: string[]
  rightItems: string[]
  pairs: Array<{ left: string; right: string }>
}

export type CommonCard = {
  category: 'common'
  id: string
  clues: string[]
  solution: string
}

export type ApproximationCard = {
  category: 'approximation'
  id: string
  prompt: string
  solution: { display: string; unit: string; value: number }
}

export type QuestionCard = SequenceCard | AssociationCard | CommonCard | ApproximationCard

export const cardDeck: Record<CardCategory, QuestionCard[]> = {
  sequence: [
    {
      category: 'sequence',
      id: 'sequence-053',
      instruction: 'Ordene de menor a mayor los cinturones de karate según su rango:',
      items: ['Azul', 'Marrón', 'Naranja', 'Verde', 'Amarillo'],
      correctOrder: ['Amarillo', 'Naranja', 'Verde', 'Azul', 'Marrón'],
    },
    {
      category: 'sequence',
      id: 'sequence-050',
      instruction: 'Ordene de menor a mayor las manos de póker según su valor:',
      items: ['Full', 'Escalera real', 'Pierna', 'Escalera', 'Póker'],
      correctOrder: ['Pierna', 'Escalera', 'Full', 'Póker', 'Escalera real'],
    },
    {
      category: 'sequence',
      id: 'sequence-046',
      instruction: 'Ordene cronológicamente los libros de Tolkien según su publicación:',
      items: ['Las dos torres', 'La comunidad del anillo', 'El regreso del rey', 'El hobbit', 'El Silmarillion'],
      correctOrder: ['El hobbit', 'La comunidad del anillo', 'Las dos torres', 'El regreso del rey', 'El Silmarillion'],
    },
    {
      category: 'sequence',
      id: 'sequence-039',
      instruction: 'Ordene de mayor a menor los títulos nobiliarios según su jerarquía:',
      items: ['Duque', 'Rey', 'Barón', 'Conde', 'Príncipe'],
      correctOrder: ['Rey', 'Príncipe', 'Duque', 'Conde', 'Barón'],
    },
    {
      category: 'sequence',
      id: 'sequence-081',
      instruction: 'Ordene cronológicamente las guerras:',
      items: ['Guerra de Crimea', 'Segunda Guerra Mundial', 'Guerra de los Treinta Años', 'Guerra del Pacífico o del Salitre', 'Guerra del Golfo'],
      correctOrder: ['Guerra de los Treinta Años', 'Guerra de Crimea', 'Guerra del Pacífico o del Salitre', 'Segunda Guerra Mundial', 'Guerra del Golfo'],
    },
    {
      category: 'sequence',
      id: 'sequence-085',
      instruction: 'Ordene de mayor a menor los animales según su período de gestación:',
      items: ['Caballo', 'Gato', 'Oveja', 'Cerdo', 'Conejo'],
      correctOrder: ['Caballo', 'Oveja', 'Cerdo', 'Gato', 'Conejo'],
    },
    {
      category: 'sequence',
      id: 'sequence-073',
      instruction: 'Ordene de menor a mayor las bandas por cantidad de integrantes:',
      items: ['Aerosmith', 'The Carpenters', 'Dave Matthews Band', 'Queen', 'The Police'],
      correctOrder: ['The Carpenters', 'The Police', 'Queen', 'Aerosmith', 'Dave Matthews Band'],
    },
    {
      category: 'sequence',
      id: 'sequence-038',
      instruction: 'Ordene cronológicamente las series según la emisión de su primer capítulo:',
      items: ['Gossip Girl', 'Ozark', "Grey's Anatomy", 'Friends', 'Familia Ingalls'],
      correctOrder: ['Familia Ingalls', 'Friends', "Grey's Anatomy", 'Gossip Girl', 'Ozark'],
    },
    {
      category: 'sequence',
      id: 'sequence-070',
      instruction: 'Ordene de mayor a menor los animales según su peso promedio:',
      items: ['Elefante', 'Hipopótamo', 'Jirafa', 'León', 'Vaca'],
      correctOrder: ['Elefante', 'Hipopótamo', 'Jirafa', 'Vaca', 'León'],
    },
    {
      category: 'sequence',
      id: 'sequence-164',
      instruction: 'Ordene los siguientes servicios según el año de lanzamiento en Argentina:',
      items: ['Netflix', 'Rappi', 'Spotify', 'Uber', 'WhatsApp'],
      correctOrder: ['WhatsApp', 'Netflix', 'Spotify', 'Uber', 'Rappi'],
    },
    {
      category: 'sequence',
      id: 'sequence-242',
      instruction: 'Ordene de menor a mayor por cantidad de partidos jugados en el Barcelona:',
      items: ['Gabriel Milito', 'Javier Mascherano', 'Javier Saviola', 'Juan Román Riquelme', 'Lionel Messi'],
      correctOrder: ['Juan Román Riquelme', 'Gabriel Milito', 'Javier Saviola', 'Javier Mascherano', 'Lionel Messi'],
    },
    {
      category: 'sequence',
      id: 'sequence-241',
      instruction: 'Ordene de mayor a menor por cantidad de campeonatos ganadas por equipos de ese país:',
      items: ['Alemania', 'España', 'Francia', 'Italia', 'Portugal'],
      correctOrder: ['Italia', 'España', 'Alemania', 'Portugal', 'Francia'],
    },
    {
      category: 'sequence',
      id: 'sequence-240',
      instruction: 'Ordene cronológicamente los momentos en la vida de Emanuel Ginóbili:',
      items: ['Gana la Medalla de Oro con la selección', 'Gana su último anillo de la NBA', 'Es padre de mellizos', 'Juega su último partido con la selección', 'Vence a Estados Unidos en el mundial'],
      correctOrder: ['Vence a Estados Unidos en el mundial', 'Gana la Medalla de Oro con la selección', 'Es padre de mellizos', 'Gana su último anillo de la NBA', 'Juega su último partido con la selección'],
    },
    {
      category: 'sequence',
      id: 'sequence-239',
      instruction: 'Ordene los actores según la edad que tenían cuando ganaron su primer Oscar:',
      items: ['Jeff Bridges', 'Jennifer Lawrence', 'Julie Andrews', 'Leonardo DiCaprio', 'Russell Crowe'],
      correctOrder: ['Jennifer Lawrence', 'Julie Andrews', 'Russell Crowe', 'Leonardo DiCaprio', 'Jeff Bridges'],
    },
    {
      category: 'sequence',
      id: 'sequence-238',
      instruction: 'Ordene cronológicamente los actores según su fecha de nacimiento:',
      items: ['Ricardo Darín', 'Federico Luppi', 'Leonardo Sbaraglia', 'Luis Brandoni', 'Nicolás Vázquez'],
      correctOrder: ['Federico Luppi', 'Luis Brandoni', 'Ricardo Darín', 'Leonardo Sbaraglia', 'Nicolás Vázquez'],
    },
    {
      category: 'sequence',
      id: 'sequence-174',
      instruction: 'Ordene cronológicamente los programas de Santiago del Moro por primera emisión:',
      items: ['¿Quién quiere ser millonario?', 'Intratables', 'Flow', 'MasterChef Celebrity Argentina', 'Infama'],
      correctOrder: ['Flow', 'Infama', 'Intratables', '¿Quién quiere ser millonario?', 'MasterChef Celebrity Argentina'],
    },
  ],
  association: [
    {
      category: 'association',
      id: 'association-048',
      instruction: 'Asocie país actual con país del pasado:',
      leftItems: ['Alemania', 'Etiopía', 'Rep. Dem. del Congo', 'Sri Lanka', 'Tailandia'],
      rightItems: ['Prusia', 'Abisinia', 'Ceilán', 'Siam', 'Zaire'],
      pairs: [
        { left: 'Alemania', right: 'Prusia' },
        { left: 'Etiopía', right: 'Abisinia' },
        { left: 'Rep. Dem. del Congo', right: 'Zaire' },
        { left: 'Sri Lanka', right: 'Ceilán' },
        { left: 'Tailandia', right: 'Siam' },
      ],
    },
    {
      category: 'association',
      id: 'association-050',
      instruction: 'Asocie político con asesino:',
      leftItems: ['Trotsky', 'JFK', 'Gandhi', 'Marat', 'Lincoln'],
      rightItems: ['John W. Booth', 'Carlota Corday', 'Ramón Mercader', 'Nathuram Godse', 'Harvey Oswald'],
      pairs: [
        { left: 'Trotsky', right: 'Ramón Mercader' },
        { left: 'JFK', right: 'Harvey Oswald' },
        { left: 'Gandhi', right: 'Nathuram Godse' },
        { left: 'Marat', right: 'Carlota Corday' },
        { left: 'Lincoln', right: 'John W. Booth' },
      ],
    },
    {
      category: 'association',
      id: 'association-057',
      instruction: 'Asocie iglesia con ciudad:',
      leftItems: ['Basílica de San Marcos', 'Sagrada Familia', 'Mezquita Azul', 'Abadía de Westminster', 'Santuario Al Askari'],
      rightItems: ['Barcelona', 'Samarra', 'Estambul', 'Londres', 'Venecia'],
      pairs: [
        { left: 'Basílica de San Marcos', right: 'Venecia' },
        { left: 'Sagrada Familia', right: 'Barcelona' },
        { left: 'Mezquita Azul', right: 'Estambul' },
        { left: 'Abadía de Westminster', right: 'Londres' },
        { left: 'Santuario Al Askari', right: 'Samarra' },
      ],
    },
    {
      category: 'association',
      id: 'association-052',
      instruction: 'Asocie ciudad con museo:',
      leftItems: ['San Petersburgo', 'Ámsterdam', 'París', 'Nueva York', 'Berlín'],
      rightItems: ['Hermitage', 'Museo de Pérgamo', 'Rijksmuseum', 'Louvre', 'Metropolitan'],
      pairs: [
        { left: 'San Petersburgo', right: 'Hermitage' },
        { left: 'Ámsterdam', right: 'Rijksmuseum' },
        { left: 'París', right: 'Louvre' },
        { left: 'Nueva York', right: 'Metropolitan' },
        { left: 'Berlín', right: 'Museo de Pérgamo' },
      ],
    },
    {
      category: 'association',
      id: 'association-035',
      instruction: 'Asocie religión con libro sagrado:',
      leftItems: ['Cristianismo', 'Judaísmo', 'Islamismo', 'Budismo', 'Confucianismo'],
      rightItems: ['Tantra', 'Corán', 'Biblia', 'Las Analectas', 'Torá'],
      pairs: [
        { left: 'Cristianismo', right: 'Biblia' },
        { left: 'Judaísmo', right: 'Torá' },
        { left: 'Islamismo', right: 'Corán' },
        { left: 'Budismo', right: 'Tantra' },
        { left: 'Confucianismo', right: 'Las Analectas' },
      ],
    },
    {
      category: 'association',
      id: 'association-029',
      instruction: 'Asocie deportista con deporte:',
      leftItems: ['Usain Bolt', 'Manny Pacquiao', 'Michael Phelps', 'Vijay Singh', 'Glenn McGrath'],
      rightItems: ['Atletismo', 'Boxeo', 'Críquet', 'Golf', 'Natación'],
      pairs: [
        { left: 'Usain Bolt', right: 'Atletismo' },
        { left: 'Manny Pacquiao', right: 'Boxeo' },
        { left: 'Michael Phelps', right: 'Natación' },
        { left: 'Vijay Singh', right: 'Golf' },
        { left: 'Glenn McGrath', right: 'Críquet' },
      ],
    },
    {
      category: 'association',
      id: 'association-049',
      instruction: 'Asocie maravilla natural con país:',
      leftItems: ['Montaña de la Mesa', 'Bahía de Ha-Long', 'Isla Jeju', 'Parque de Komodo', 'Cataratas del Iguazú'],
      rightItems: ['Argentina', 'Corea del Sur', 'Vietnam', 'Sudáfrica', 'Indonesia'],
      pairs: [
        { left: 'Montaña de la Mesa', right: 'Sudáfrica' },
        { left: 'Bahía de Ha-Long', right: 'Vietnam' },
        { left: 'Isla Jeju', right: 'Corea del Sur' },
        { left: 'Parque de Komodo', right: 'Indonesia' },
        { left: 'Cataratas del Iguazú', right: 'Argentina' },
      ],
    },
    {
      category: 'association',
      id: 'association-056',
      instruction: 'Asocie río con país:',
      leftItems: ['Sena', 'Támesis', 'Volga', 'Ebro', 'San Francisco'],
      rightItems: ['Inglaterra', 'Francia', 'Rusia', 'Brasil', 'España'],
      pairs: [
        { left: 'Sena', right: 'Francia' },
        { left: 'Támesis', right: 'Inglaterra' },
        { left: 'Volga', right: 'Rusia' },
        { left: 'Ebro', right: 'España' },
        { left: 'San Francisco', right: 'Brasil' },
      ],
    },
    {
      category: 'association',
      id: 'association-045',
      instruction: 'Asocie país con marca de ropa:',
      leftItems: ['Japón', 'España', 'Brasil', 'Suecia', 'Reino Unido'],
      rightItems: ['H&M', 'Pepe Jeans', 'Mango', 'Uniqlo', 'Havaianas'],
      pairs: [
        { left: 'Japón', right: 'Uniqlo' },
        { left: 'España', right: 'Mango' },
        { left: 'Brasil', right: 'Havaianas' },
        { left: 'Suecia', right: 'H&M' },
        { left: 'Reino Unido', right: 'Pepe Jeans' },
      ],
    },
    {
      category: 'association',
      id: 'association-032',
      instruction: 'Asocie familia con novela:',
      leftItems: ['Bennet', 'Buendía', 'Rostov', 'Trueba', 'Vidal Olmos'],
      rightItems: ['Cien años de soledad', 'La casa de los espíritus', 'La guerra y la paz', 'Orgullo y prejuicio', 'Sobre héroes y tumbas'],
      pairs: [
        { left: 'Bennet', right: 'Orgullo y prejuicio' },
        { left: 'Buendía', right: 'Cien años de soledad' },
        { left: 'Rostov', right: 'La guerra y la paz' },
        { left: 'Trueba', right: 'La casa de los espíritus' },
        { left: 'Vidal Olmos', right: 'Sobre héroes y tumbas' },
      ],
    },
    {
      category: 'association',
      id: 'association-241',
      instruction: 'Asocie arquero con selección:',
      leftItems: ['Fernando Muslera', 'Jorge Campos', 'José Luis Chilavert', 'Keylor Navas', 'René Higuita'],
      rightItems: ['Costa Rica', 'Colombia', 'México', 'Paraguay', 'Uruguay'],
      pairs: [
        { left: 'Fernando Muslera', right: 'Uruguay' },
        { left: 'Jorge Campos', right: 'México' },
        { left: 'José Luis Chilavert', right: 'Paraguay' },
        { left: 'Keylor Navas', right: 'Costa Rica' },
        { left: 'René Higuita', right: 'Colombia' },
      ],
    },
    {
      category: 'association',
      id: 'association-240',
      instruction: 'Asocie perro con raza:',
      leftItems: ['Huesos (Los Simpsons)', 'Milo (La máscara)', 'Milú (Tintín)', 'Odie (Garfield)', 'Dama (... y el vagabundo)'],
      rightItems: ['Beagle', 'Cocker Spaniel', 'Fox terrier', 'Galgo', 'Jack Russell'],
      pairs: [
        { left: 'Huesos (Los Simpsons)', right: 'Beagle' },
        { left: 'Milo (La máscara)', right: 'Jack Russell' },
        { left: 'Milú (Tintín)', right: 'Fox terrier' },
        { left: 'Odie (Garfield)', right: 'Galgo' },
        { left: 'Dama (... y el vagabundo)', right: 'Cocker Spaniel' },
      ],
    },
    {
      category: 'association',
      id: 'association-239',
      instruction: 'Asocie animal con clase:',
      leftItems: ['Murciélago', 'Pingüino', 'Rana', 'Tiburón', 'Tortuga'],
      rightItems: ['Anfibio', 'Ave', 'Mamífero', 'Pez', 'Reptil'],
      pairs: [
        { left: 'Murciélago', right: 'Mamífero' },
        { left: 'Pingüino', right: 'Ave' },
        { left: 'Rana', right: 'Anfibio' },
        { left: 'Tiburón', right: 'Pez' },
        { left: 'Tortuga', right: 'Reptil' },
      ],
    },
    {
      category: 'association',
      id: 'association-238',
      instruction: 'Asocie provincia con bono emitido previo a la crisis de 2001:',
      leftItems: ['Buenos Aires', 'Córdoba', 'Corrientes', 'Chaco', 'San Juan'],
      rightItems: ['Huarpe', 'Lecor', 'Patacón', 'Quebracho', 'Cecacor'],
      pairs: [
        { left: 'Buenos Aires', right: 'Patacón' },
        { left: 'Córdoba', right: 'Lecor' },
        { left: 'Corrientes', right: 'Cecacor' },
        { left: 'Chaco', right: 'Quebracho' },
        { left: 'San Juan', right: 'Huarpe' },
      ],
    },
    {
      category: 'association',
      id: 'association-237',
      instruction: 'Asocie perro y programa de televisión:',
      leftItems: ['Brian', 'Fatiga', 'Ayudante de Santa', 'Murray', 'Tronco'],
      rightItems: ['Los Simpsons', 'Brigada Cola', 'Casados con hijos', 'Mad About You', 'Padre de Familia'],
      pairs: [
        { left: 'Brian', right: 'Padre de Familia' },
        { left: 'Fatiga', right: 'Casados con hijos' },
        { left: 'Ayudante de Santa', right: 'Los Simpsons' },
        { left: 'Murray', right: 'Mad About You' },
        { left: 'Tronco', right: 'Brigada Cola' },
      ],
    },
    {
      category: 'association',
      id: 'association-168',
      instruction: 'Asocie compositor con obra musical:',
      leftItems: ['Chaikovski', 'Schubert', 'Verdi', 'Puccini', 'Mozart'],
      rightItems: ['Ave María', 'La traviata', 'La bohème', 'El lago de los cisnes', 'La flauta mágica'],
      pairs: [
        { left: 'Chaikovski', right: 'El lago de los cisnes' },
        { left: 'Schubert', right: 'Ave María' },
        { left: 'Verdi', right: 'La traviata' },
        { left: 'Puccini', right: 'La bohème' },
        { left: 'Mozart', right: 'La flauta mágica' },
      ],
    },
  ],
  common: [
    {
      category: 'common',
      id: 'common-057',
      clues: ['Perazzi', 'Bersa', 'Taurus', 'Heckler & Koch'],
      solution: 'Son marcas de armas.',
    },
    {
      category: 'common',
      id: 'common-064',
      clues: ['Laertes', 'Mercucio', 'Romeo', 'Shylock', 'Ariel'],
      solution: 'Son personajes creados por Shakespeare.',
    },
    {
      category: 'common',
      id: 'common-037',
      clues: ['Anna Scott', 'Julianne Potter', 'Maggie Carpenter', 'Katherine Watson', 'Tess Ocean'],
      solution: 'Fueron papeles interpretados por Julia Roberts.',
    },
    {
      category: 'common',
      id: 'common-054',
      clues: ['Jim Morrison', 'Janis Joplin', 'Jean-Michel Basquiat', 'Kurt Cobain', 'Amy Winehouse'],
      solution: 'Murieron a los 27 años.',
    },
    {
      category: 'common',
      id: 'common-056',
      clues: ['Reino Unido', 'Francia', 'España', 'Argelia', 'Mali'],
      solution: 'Son países atravesados por el Meridiano de Greenwich.',
    },
    {
      category: 'common',
      id: 'common-069',
      clues: ['El gran dictador', 'Tiempos modernos', 'El pibe', 'El circo', 'El inmigrante'],
      solution: 'Son películas de Charlie Chaplin.',
    },
    {
      category: 'common',
      id: 'common-081',
      clues: ['Ramón Gómez Valdés Castillo', 'María Antonieta de las Nieves', 'Carlos Villagrán Eslava', 'Rubén Aguirre Fernández Abad', 'Édgar Vivar'],
      solution: 'Son actores de la serie El Chavo del 8.',
    },
    {
      category: 'common',
      id: 'common-039',
      clues: ['Barack Obama', 'Jimmy Carter', 'Nelson Mandela', 'Mijaíl Gorbachov', 'Madre Teresa'],
      solution: 'Recibieron el Premio Nobel de la Paz.',
    },
    {
      category: 'common',
      id: 'common-069-tribes',
      clues: ['Sioux', 'Comanches', 'Mohicanos', 'Cherokee', 'Apaches'],
      solution: 'Son tribus indígenas norteamericanas.',
    },
    {
      category: 'common',
      id: 'common-038',
      clues: ['Seda', 'Manteca', 'Aluminio', 'Vegetal', 'Romaní'],
      solution: 'Son tipos de papel.',
    },
    {
      category: 'common',
      id: 'common-237',
      clues: ['La mala educación', 'Todo sobre mi madre', 'Tacones lejanos', 'La ley del deseo', 'Matador'],
      solution: 'Son películas dirigidas por Pedro Almodóvar.',
    },
    {
      category: 'common',
      id: 'common-242',
      clues: ['Rubén Rada', 'Hugo Ibarra', 'Alberto Olmedo', 'Horacio Fontova', 'Oscar González Oro'],
      solution: 'Su apodo es “Negro”.',
    },
    {
      category: 'common',
      id: 'common-240',
      clues: ['Fukushima I', 'Chernobyl', 'Atucha I', 'Three Mile Island', 'Angra I'],
      solution: 'Son plantas nucleares.',
    },
    {
      category: 'common',
      id: 'common-239',
      clues: ['Copa Intercontinental 2007', 'Copa Libertadores 2007', 'Apertura 2011', 'Copa Argentina 2021', 'Liga Profesional 2022'],
      solution: 'Son torneos de fútbol donde Boca Juniors salió campeón.',
    },
    {
      category: 'common',
      id: 'common-238',
      clues: ["Francia '38", "Brasil '50", "Suiza '54", "México '70"],
      solution: 'La selección argentina no participó.',
    },
    {
      category: 'common',
      id: 'common-174',
      clues: ['Bolívar', 'Chimborazo', 'Galán', 'Tronador', 'Fitz Roy'],
      solution: 'Son picos de la cordillera de los Andes.',
    },
  ],
  approximation: [
    {
      category: 'approximation',
      id: 'approximation-053',
      prompt: '¿Cuántos días estuvieron atrapados en la mina los 33 mineros de Chile tras el derrumbe hasta ser rescatados?',
      solution: { display: '69 días', unit: 'días', value: 69 },
    },
    {
      category: 'approximation',
      id: 'approximation-029',
      prompt: '¿Cuál es la distancia entre París y Nueva York?',
      solution: { display: '5.836,77 km', unit: 'km', value: 5836.77 },
    },
    {
      category: 'approximation',
      id: 'approximation-058',
      prompt: '¿En qué año se montó el primer cinturón de seguridad como equipamiento estándar de un automóvil de producción masiva?',
      solution: { display: '1959', unit: 'año', value: 1959 },
    },
    {
      category: 'approximation',
      id: 'approximation-059',
      prompt: '¿Cuántos goles convirtió la selección argentina en Copas mundiales hasta 2022? (incluido el Mundial de Qatar)',
      solution: { display: '152 goles', unit: 'goles', value: 152 },
    },
    {
      category: 'approximation',
      id: 'approximation-031',
      prompt: '¿Cuál es la distancia media entre el centro de la Tierra y la Luna?',
      solution: { display: '384.403 km', unit: 'km', value: 384403 },
    },
    {
      category: 'approximation',
      id: 'approximation-050',
      prompt: '¿Cuántas lentejas hay en un paquete de 1 kilo?',
      solution: { display: '22.300 lentejas', unit: 'lentejas', value: 22300 },
    },
    {
      category: 'approximation',
      id: 'approximation-030',
      prompt: '¿Cuántas horas tardó la misión Apolo XI desde su lanzamiento hasta su amerizaje?',
      solution: { display: '102 horas y 47 minutos', unit: 'minutos', value: 6167 },
    },
    {
      category: 'approximation',
      id: 'approximation-028',
      prompt: '¿En qué fecha fue presentada la primera versión de Windows (1.0)?',
      solution: { display: 'El 10 de noviembre de 1983', unit: 'año', value: 1983 },
    },
    {
      category: 'approximation',
      id: 'approximation-042',
      prompt: '¿Cuántos años vivió Leonardo da Vinci?',
      solution: { display: '67 años', unit: 'años', value: 67 },
    },
    {
      category: 'approximation',
      id: 'approximation-002',
      prompt: '¿Cuántos visitantes tuvo el Museo del Louvre en el año 2019?',
      solution: { display: '9.600.000 visitantes', unit: 'visitantes', value: 9600000 },
    },
    {
      category: 'approximation',
      id: 'approximation-241',
      prompt: '¿En qué fecha fue puesto en órbita el primer satélite argentino Lusat 1?',
      solution: { display: '22 de enero de 1990', unit: 'año', value: 1990 },
    },
    {
      category: 'approximation',
      id: 'approximation-242',
      prompt: '¿Cuántos casos resolvieron en pantalla “Los Simuladores”?',
      solution: { display: '35 casos', unit: 'casos', value: 35 },
    },
    {
      category: 'approximation',
      id: 'approximation-240',
      prompt: '¿Cuál es la capacidad del estadio Club Atlético River Plate?',
      solution: { display: '72.054 espectadores', unit: 'espectadores', value: 72054 },
    },
    {
      category: 'approximation',
      id: 'approximation-239',
      prompt: '¿Cuántos faros hay en la República Argentina?',
      solution: { display: '62 faros', unit: 'faros', value: 62 },
    },
    {
      category: 'approximation',
      id: 'approximation-238',
      prompt: '¿Cuántas palabras tiene el Preámbulo de la Constitución Nacional Argentina?',
      solution: { display: '100 palabras', unit: 'palabras', value: 100 },
    },
    {
      category: 'approximation',
      id: 'approximation-160',
      prompt: '¿Cuántos metros tiene el perímetro de la Quinta Presidencial en Olivos?',
      solution: { display: '2.601 metros', unit: 'metros', value: 2601 },
    },
  ],
}
