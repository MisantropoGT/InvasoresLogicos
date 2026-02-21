const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 640,
    height: 480, // Un tamaño más estándar para RPG
    scale: {
        mode: Phaser.Scale.FIT, // Escala el juego para que quepa en el contenedor
        autoCenter: Phaser.Scale.CENTER_BOTH // Lo centra matemáticamente
    },
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 }, debug: true }
    },
    scene: { preload: preload, create: create, update: update }
};

// *******************************
//Variables globales para el juego
//********************************

// Crear la instancia del juego

const game = new Phaser.Game(config);
let player;
let cursors;
let touchControls = { up: false, down: false, left: false, right: false };
let pendienteCerrarCombate = false;

// Variables globales para el audio
let bgmMundo;
let bgmBatalla;
let sfxItem;
const sonidoMenuHover = new Audio('assets/sounds/hover.mp3');
sonidoMenuHover.volume = 0.5;

// Variables globales para la batalla
let enemigoActual = null;
let turnoJugador = true;

// Objeto para almacenar las estadísticas del jugador
let playerStats = {
    nivel: 1,
    hp: 100,
    hpMax: 100,
    energia: 50,
    energiaMax: 50,
    fuerza: 10,
    defensa: 8,
    luc: 5,
    puntosDisponibles: 5,
    experiencia: 0,
    oro: 500,
    equipo: {
        arma: null,
        cabeza: null,
        cuerpo: null,
        guantes: null,
        botas: null,
        accesorio: null
    },
    inventario: [], // Objetos con sus características (estilo diccionarios)
    habilidades: ['golpe_basico', 'ataque_ddos', null, null]


};
// ------- BASES DE DATOS -------
// Base de datos de todos los ítems del juego
const itemsDB = {
    // --- ARMAS ---
    'espada_euler': {
        id: 'espada_euler',
        nombre: 'Espada de Euler',
        tipo: 'arma',
        atkMin: 8,
        atkMax: 14,
        costoEnergia: 5,
        bonos: { str: 2, luc: 3 }, // Substats
        icono: '🗡️', //sprite
        desc: 'Un arma perfectamente balanceada usando la constante e.'
    },
    // --- EQUIPAMIENTO ---
    'botas_newton': {
        id: 'botas_newton',
        nombre: 'Botas de Newton',
        tipo: 'botas',
        bonos: { defensa: 2, velocidad: 10 },
        icono: '👢', //sprite
        desc: 'Ignoran parcialmente la fricción.'
    },
    // --- CONSUMIBLES ---
    'cafe_matematico': {
        id: 'cafe_matematico',
        nombre: 'Café Matemático',
        tipo: 'consumible',
        efecto: { recuperaHP: 20, recuperaEN: 15 },
        icono: '☕',
        desc: 'Restaura HP y Energía para seguir resolviendo problemas.'
    },
    // --- Varios ----
    'libro_logica':{
        id: 'libro_logica',
        nombre: 'Libro de Logica Boolena',
        tipo: 'varios',
        icono: '📘',
        precio: 100
    },
    // --- OBJETOS CLAVE ---
    'llave_booleana': {
        id: 'llave_booleana',
        nombre: 'Llave Booleana (True)',
        tipo: 'clave',
        icono: '🔑',
        desc: 'Abre compuertas lógicas tipo AND.'
    }
};

// Base de datos de Enemigos
const enemigosDB = {
    'alien_glitch': {
        id: 'alien_glitch', nombre: 'Alien Glitch', 
        hpMax: 120, hp: 120, atk: 8, def: 5, xp: 15
    },
    'bug_acorazado': {
        id: 'bug_acorazado', nombre: 'Bug Acorazado', 
        hpMax: 80, hp: 80, atk: 12, def: 15, xp: 35
    }
};

// Base de datos de Habilidades (Movimientos)
const habilidadesDB = {
    'golpe_basico': {
        id: 'golpe_basico', nombre: 'Golpe Lógico',
        multiplicador: 1.0, precision: 100, costoEnergia: 0, tipo: 'normal'
    },
    'ataque_ddos': {
        id: 'ataque_ddos', nombre: 'Ráfaga DDoS',
        multiplicador: 1.5, precision: 85, costoEnergia: 15, tipo: 'red'
    },
    'inyeccion_sql': {
        id: 'inyeccion_sql', nombre: 'Inyección SQL',
        multiplicador: 2.0, precision: 70, costoEnergia: 25, tipo: 'codigo'
    }
};

function preload() {
    // 1. Cargar el JSON
    this.load.tilemapTiledJSON('mapa1', 'assets/images/mapa1.json');

    // 2. Cargar las imágenes

    this.load.image('terreno', 'assets/images/terreno.png');
    this.load.image('arboles', 'assets/images/arboles.png');
    this.load.image('edificios', 'assets/images/edificios.png');
    this.load.image('decoraciones', 'assets/images/decoraciones.png');
    this.load.image('techos', 'assets/images/techos.png');

    // 3. Cargar el sprite del jugador (Asegúrate de que el tamaño de cada frame sea correcto)
    this.load.spritesheet('player', 'assets/sprites/personaje1.png', {
        frameWidth: 32, frameHeight: 48
    });

    // 4. Cargar des sprites enemigos
    this.load.spritesheet('alien', 'assets/sprites/alien1.png', {
        frameWidth: 32, frameHeight: 32
    });

    // 5. Cargar sprites de Items
    this.load.image('recolectable', 'assets/sprites/recolectable.png');

    // 6. Cargar Audio
    this.load.audio('musica_mundo', 'assets/sounds/world_bgm_m1.mp3');
    this.load.audio('musica_batalla', 'assets/sounds/battle_bgm.mp3');
    this.load.audio('sonido_item', 'assets/sounds/pickup.mp3');
}

function create() {
    // 1. CREACIÓN DEL MUNDO (Reemplaza los gráficos de líneas anteriores)
    const map = this.make.tilemap({ key: 'mapa1' });

    // IMPORTANTE: El primer nombre debe ser el que aparece en Tiled (ej: "Edificios_Set")
    // El segundo es el apodo que pusimos en preload ('tiles_edificios')
    const tileset = map.addTilesetImage('terreno', 'terreno');
    const tilesetEdificios = map.addTilesetImage('edificios', 'edificios');
    const tilesetArboles = map.addTilesetImage('arboles', 'arboles');
    const tilesetDecoraciones = map.addTilesetImage('decoraciones', 'decoraciones');
    const tilesetTechos = map.addTilesetImage('techos', 'techos');
    //const tilesetArboles = map.addTilesetImage('Arboles', 'arboles');

    // Creamos las capas. Si en Tiled tu capa se llama "Suelo", aquí pones "Suelo"
    const capaFondo = map.createLayer('fondo', tileset);
    const capaCaminos = map.createLayer('caminos', tileset, 0, 0);
    const capaCasas = map.createLayer('casas', tilesetEdificios, 0, 0);
    const capaDecoraciones = map.createLayer('Decoraciones', tilesetDecoraciones);
    const capaTerrenoAlto = map.createLayer('Terreno alto', tileset);
    //const capaArboles = map.createLayer('Arboles', tilesetArboles, 0, 0);



    // 2. FÍSICAS DE COLISIÓN
    // Esto hace que lo que marcaste con la propiedad "collides" en Tiled sea sólido
    capaCasas.setCollisionByProperty({ collides: true });


    // 3. JUGADOR (Mantenemos tu lógica)
    player = this.physics.add.sprite(100, 100, 'player'); // Cambié la posición inicial a 100,100
    player.setCollideWorldBounds(true);

    // Hacemos que el jugador choque con las paredes del mapa de Tiled
    //this.physics.add.collider(player, capaCasas);
    // Colisión entre el jugador y la capa de casas
    this.physics.add.collider(player, capaCasas, (objeto1, objeto2) => {
        // En Phaser, cuando chocas con un Tilemap, el segundo objeto es el 'Tile'
        const tile = objeto2;

        // 1. Acceder a los datos de colisión del Tileset
        // Buscamos si el tile tiene objetos definidos en el editor de colisiones
        const datosTileset = tilesetEdificios.getTileData(tile.index);

        if (datosTileset && datosTileset.objectgroup && datosTileset.objectgroup.objects) {
            // Recorremos los objetos de colisión de ese tile específico
            datosTileset.objectgroup.objects.forEach(obj => {
                // 2. FILTRAR POR CLASE
                if (obj.class === 'solido' || obj.type === 'solido') {
                    console.log("Has chocado con una estructura de clase: SOLIDO");
                    // Aquí podrías, por ejemplo, hacer que el personaje diga algo
                }

                if (obj.class === 'Arbol') {
                    console.log("Esto es un árbol, su colisión es distinta.");
                }
            });
        }
    });

    //ITEMS
    // definición y posición en el mapa
    let libroLogica = this.physics.add.image(300, 200, 'recolectable');
    libroLogica.setData('itemId', 'libro_logica'); 
    let espadaEuler = this.physics.add.image(150, 200, 'recolectable'); // Sprite temporal
    espadaEuler.setData('itemId', 'espada_euler'); // Usamos el ID de la base de datos

    this.physics.add.overlap(player, libroLogica, recolectarItem, null, this);
    this.physics.add.overlap(player, espadaEuler, recolectarItem, null, this);

    
    //animación del ITEM


    this.tweens.add({
        targets: libroLogica,
        y: libroLogica.y - 10,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });
    this.physics.add.overlap(player, libroLogica, recolectarItem, null, this);
    this.physics.add.overlap(player, espadaEuler, recolectarItem, null, this);

    // 4. ANIMACIONES 
    this.anims.create({
        key: 'abajo',
        frames: this.anims.generateFrameNumbers('player', { start: 0, end: 2 }),
        frameRate: 10,
        repeat: -1
    });

    this.anims.create({
        key: 'izquierda',
        frames: this.anims.generateFrameNumbers('player', { start: 3, end: 5 }),
        frameRate: 10,
        repeat: -1
    });

    this.anims.create({
        key: 'derecha',
        frames: this.anims.generateFrameNumbers('player', { start: 6, end: 8 }),
        frameRate: 10,
        repeat: -1
    });

    this.anims.create({
        key: 'arriba',
        frames: this.anims.generateFrameNumbers('player', { start: 9, end: 11 }),
        frameRate: 10,
        repeat: -1
    });

    // Configuramos los controles táctiles
    configurarControlesTactiles();

    // 5. CÁMARA (Nuevo: para que el mapa no se vea estático)
    this.cameras.main.startFollow(player);
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    //this.cameras.main.setZoom(1.5); // Hace un pequeño acercamiento para ver mejor los detalles del pixel art

    // 6. CONTROLES (Mantenemos los tuyos)
    cursors = this.input.keyboard.createCursorKeys();
    this.input.on('pointerdown', (pointer) => handleTouch(pointer));
    this.input.on('pointerup', () => {
        player.setVelocity(0);
        player.anims.stop();
    });

    // 7. ENEMIGOS (Nuevo: para agregar enemigos básicos)
    // Izquierda (Columna 3): frames 3, 7, 11
    this.anims.create({
        key: 'alien_izq',
        frames: [{ key: 'alien', frame: 3 }, { key: 'alien', frame: 7 }, { key: 'alien', frame: 11 }],
        frameRate: 8,
        repeat: -1
    });

    // Derecha (Columna 0): frames 0, 4, 8
    this.anims.create({
        key: 'alien_der',
        frames: [{ key: 'alien', frame: 0 }, { key: 'alien', frame: 4 }, { key: 'alien', frame: 8 }],
        frameRate: 8,
        repeat: -1
    });

    // Arriba (Columna 2): frames 2, 6, 10
    this.anims.create({
        key: 'alien_arr',
        frames: [{ key: 'alien', frame: 2 }, { key: 'alien', frame: 6 }, { key: 'alien', frame: 10 }],
        frameRate: 8,
        repeat: -1
    });

    // Abajo (Columna 1): frames 1, 5, 9
    this.anims.create({
        key: 'alien_abj',
        frames: [{ key: 'alien', frame: 1 }, { key: 'alien', frame: 5 }, { key: 'alien', frame: 9 }],
        frameRate: 8,
        repeat: -1
    });

    // Crear el Alien en una posición de tu mapa
    this.alien = this.physics.add.sprite(400, 300, 'alien');
    this.alien.play('alien_izq'); // Empieza mirando a la izquierda

    // Configuración de Patrulla Matemática
    this.alien.setData('paso', 0); // Estado del movimiento
    this.alien.setVelocityY(80);
    this.alien.play('alien_abj');

    // 8. DETECCIÓN DE COLISIÓN ENTRE JUGADOR Y ENEMIGO
    this.physics.add.overlap(player, this.alien, (p, a) => {
        // 1. Detenemos el movimiento físico para que no sigan chocando
        this.physics.world.pause();

        // 2. Detenemos las animaciones del jugador
        player.anims.stop();

        // 3. Lanzamos la función de transición
        iniciarCombate(a);
    }, null, this);




    // Crear un contenedor gráfico para la barra de vida
    this.hpBar = this.add.graphics();

    // Configurar los sonidos
    bgmMundo = this.sound.add('musica_mundo', { loop: true, volume: 0.3 });
    bgmBatalla = this.sound.add('musica_batalla', { loop: true, volume: 0.5 });
    sfxItem = this.sound.add('sonido_item', { volume: 0.7 });

    // Iniciar la música del mapa
    bgmMundo.play();

}


function update() {

    // 1. Lógica de movimiento y selección de animación
    player.setVelocity(0);
    let speed = 80;

    // Lógica combinada: Teclado || Táctil
    if (cursors.left.isDown || touchControls.left) {
        player.setVelocityX(-speed);
        player.play('izquierda', true);
    }
    else if (cursors.right.isDown || touchControls.right) {
        player.setVelocityX(speed);
        player.play('derecha', true);
    }

    if (cursors.up.isDown || touchControls.up) {
        player.setVelocityY(-speed);
        player.play('arriba', true);
    }
    else if (cursors.down.isDown || touchControls.down) {
        player.setVelocityY(speed);
        player.play('abajo', true);
    }

    if (player.body.velocity.x === 0 && player.body.velocity.y === 0) {
        player.anims.stop();
    }
    else {
        // 2. Si no se presiona nada, detenemos la animación
        //player.anims.stop();

        // Opcional: Para que se quede mirando en la última dirección 
        // podrías usar player.setFrame(índice_de_quieto);
    }
    player.body.velocity.normalize().scale(speed);

    // 3. Soporte para diagonales (Opcional)
    // Para que no se mueva más rápido en diagonal (teorema de Pitágoras),
    // normalizamos la velocidad si es necesario, pero para empezar, 
    // la estructura de arriba es perfecta.
    //player.body.velocity.normalize().scale(160);

    // Lógica para que el alien camine en cuadrado
    // Si camina 200px hacia abajo, que gire a la derecha, etc.

    let alien = this.alien;
    //let speed = 80;

    // Ejemplo de patrulla en 4 direcciones basada en distancia recorrida
    if (alien.body.velocity.y > 0 && alien.y > 500) { // Llegó al límite inferior
        alien.setVelocity(speed, 0);
        alien.play('alien_der', true);
    } else if (alien.body.velocity.x > 0 && alien.x > 570) { // Límite derecho
        alien.setVelocity(0, -speed);
        alien.play('alien_arr', true);
    } else if (alien.body.velocity.y < 0 && alien.y < 300) { // Límite superior
        alien.setVelocity(-speed, 0);
        alien.play('alien_izq', true);
    } else if (alien.body.velocity.x < 0 && alien.x < 400) { // Límite izquierdo
        alien.setVelocity(0, speed);
        alien.play('alien_abj', true);
    }

    // Lógica de detección del jugador por parte del alien
    let distancia = Phaser.Math.Distance.Between(player.x, player.y, this.alien.x, this.alien.y);

    if (distancia < 100) {
        this.alien.setTint(0xff0000); // Se pone rojo al detectar al jugador
        // Aquí podrías lanzar el desafío lógico automáticamente
    } else {
        this.alien.clearTint();
    }

    // Lógica para dibujar la barra de vida del jugador
    dibujarBarraVida(this, player.x, player.y, playerStats);


}

// ---------------------
// Funciones de los menu
//----------------------
// 1. Abrir y Cerrar el Menú
function toggleMenu() {
    const menu = document.getElementById('menu-rpg');

    if (menu.style.display === 'none' || menu.style.display === '') {
        // Abrir menú
        menu.style.display = 'flex';
        actualizarMenuStats();
        actualizarInventario();

        // Pausar el juego en el fondo
        game.scene.scenes[0].physics.world.pause();
    } else {
        // Cerrar menú
        menu.style.display = 'none';
        game.scene.scenes[0].physics.world.resume();
    }
}

// 3. Lógica para distribuir puntos de estadística
function subirStat(stat) {
    if (playerStats.puntosDisponibles > 0) {
        if (stat === 'fuerza') {
            playerStats.fuerza += 1;
        } else if (stat === 'defensa') {
            playerStats.defensa += 1;
        } else if (stat === 'hpMax') {
            playerStats.hpMax += 10;
        } else if (stat === 'energiaMax') {
            playerStats.energiaMax += 5;
        } else if (stat === 'suerte') {
            playerStats.luc += 1;
        }

        // Aquí puedes agregar 'hpMax' o 'energiaMax' si creas sus botones en el HTML

        playerStats.puntosDisponibles -= 1;
        actualizarMenuStats(); // Refrescar la pantalla instantáneamente
    } else {
        mostrarMensaje("No tienes puntos de lógica para distribuir.");
    }
}

// 4. Actualizar la interfaz de Estadísticas
function actualizarMenuStats() {
    document.getElementById('hp-val').innerText = `${playerStats.hp} / ${playerStats.hpMax}`;
    document.getElementById('ene-val').innerText = `${playerStats.energia} / ${playerStats.energiaMax}`;
    document.getElementById('pts-val').innerText = playerStats.puntosDisponibles;
    
    // Calculamos el total de modificadores
    const bonos = calcularBonosEquipo();
    
    // Imprimimos BASE + BONO
    document.getElementById('str-val').innerText = playerStats.fuerza;
    document.getElementById('str-bono').innerText = bonos.str > 0 ? `+ ${bonos.str}` : '';
    
    document.getElementById('def-val').innerText = playerStats.defensa;
    document.getElementById('def-bono').innerText = bonos.defensa > 0 ? `+ ${bonos.defensa}` : '';
    
    // Si 'luc' (suerte) no existe en playerStats, puedes añadirlo: playerStats.luc = 5;
    document.getElementById('luc-val').innerText = playerStats.luc || 0;
    document.getElementById('luc-bono').innerText = bonos.luc > 0 ? `+ ${bonos.luc}` : '';

    // Actualizamos el oro
        document.getElementById('oro-val').innerText = playerStats.oro;
}

// ------------------------------
// Sección de Inventario y Equipamiento
// ------------------------------

// 1. Mostrar los ítems del inventario con botones dinámicos

function actualizarInventario() {
    // 1. DIBUJAR LA MOCHILA
    const grid = document.getElementById('lista-items');
    grid.innerHTML = ''; 

    playerStats.inventario.forEach((item, index) => {
        let div = document.createElement('div');
        div.className = 'inv-slot';
        
        // Si el icono es un string corto (emoji), lo ponemos como texto. Si es ruta, usaríamos <img> o background-image
        div.innerHTML = item.icono; 
        
        // Al pasar el ratón, mostramos la descripción
        div.onmouseenter = () => mostrarInfoItem(item);
        
        // Al hacer clic, equipamos o usamos
        div.onclick = () => {
            if (item.tipo === 'consumible') {
                usarItem(index);
            } else {
                equiparItem(index);
            }
        };
        
        grid.appendChild(div);
    });

    // Rellenar con espacios vacíos para que la cuadrícula se vea completa (opcional, ej. 12 espacios)
    while (grid.children.length < 12) {
        let emptyDiv = document.createElement('div');
        emptyDiv.className = 'inv-slot';
        emptyDiv.style.borderColor = '#333';
        grid.appendChild(emptyDiv);
    }

    // 2. DIBUJAR EL EQUIPO ACTUAL
    const ranuras = ['cabeza', 'arma', 'cuerpo', 'guantes', 'botas', 'accesorio'];
    
    ranuras.forEach(ranura => {
        const divRanura = document.getElementById(`slot-${ranura}`);
        const itemEquipado = playerStats.equipo[ranura];
        
        if (itemEquipado) {
            divRanura.innerHTML = itemEquipado.icono;
            divRanura.classList.add('filled');
            divRanura.onmouseenter = () => mostrarInfoItem(itemEquipado);
        } else {
            // Restaurar texto por defecto si está vacío
            divRanura.innerHTML = ranura;
            divRanura.classList.remove('filled');
            divRanura.onmouseenter = () => {}; // Quitar tooltip
        }
    });
}

// Mostrar detalles en el panel inferior
function mostrarInfoItem(item) {
    let texto = `<strong style="color:#00ff41;">${item.nombre}</strong><br>${item.desc}`;
    if (item.bonos) {
        texto += ` <span style="color:#ffcc00;">[Bonos: `;
        if (item.bonos.str) texto += `Fuerza +${item.bonos.str} `;
        if (item.bonos.defensa) texto += `Def +${item.bonos.defensa} `;
        if (item.bonos.luc) texto += `Suerte +${item.bonos.luc}`;
        texto += `]</span>`;
    }
    document.getElementById('item-info-panel').innerHTML = texto;
}

// 2. Función para equipar (Intercambio de matrices)
function equiparItem(index) {
    const itemAEquipar = playerStats.inventario[index];
    const ranura = itemAEquipar.tipo; // ej: 'arma'
    
    // Si ya teníamos algo en esa ranura, lo devolvemos al inventario
    if (playerStats.equipo[ranura]) {
        playerStats.inventario.push(playerStats.equipo[ranura]);
    }
    
    // Asignamos el nuevo ítem a la ranura
    playerStats.equipo[ranura] = itemAEquipar;
    
    // Lo eliminamos del inventario
    playerStats.inventario.splice(index, 1);
    
    // Actualizamos la UI y reproducimos sonido opcional
    actualizarInventario();
    actualizarMenuStats();
    mostrarMensaje(`Has equipado: ${itemAEquipar.nombre}`);
}

// Función para DESEQUIPAR haciendo clic en la silueta
function desequiparItem(ranura) {
    const item = playerStats.equipo[ranura];
    if (item) {
        // Pasa del equipo a la mochila
        playerStats.inventario.push(item);
        playerStats.equipo[ranura] = null;
        
        actualizarInventario();
        actualizarMenuStats();
        mostrarMensaje(`Te has quitado: ${item.nombre}`);
    }
}

// 3. Función matemática para sumar bonos
function calcularBonosEquipo() {
    let bonos = { str: 0, defensa: 0, luc: 0 };
    
    // Iteramos por todas las ranuras de equipo
    for (const ranura in playerStats.equipo) {
        const item = playerStats.equipo[ranura];
        // Si hay un ítem y tiene la propiedad 'bonos'
        if (item && item.bonos) {
            if (item.bonos.str) bonos.str += item.bonos.str;
            if (item.bonos.defensa) bonos.defensa += item.bonos.defensa;
            if (item.bonos.luc) bonos.luc += item.bonos.luc;
        }
    }
    return bonos;
}

// Función para dibujar la barra (puedes llamarla en el update)
function dibujarBarraVida(escena, x, y, stats) {
    escena.hpBar.clear();

    // Fondo negro (borde)
    escena.hpBar.fillStyle(0x000000);
    escena.hpBar.fillRect(x - 20, y - 40, 40, 6);

    // Barra verde proporcional al HP actual
    let anchoVerde = (stats.hp / stats.hpMax) * 40;
    escena.hpBar.fillStyle(0x00ff00);
    escena.hpBar.fillRect(x - 20, y - 40, anchoVerde, 6);
}

function toggleSection(idSeccion) {
    const seccion = document.getElementById(idSeccion);

    // Si ya está abierta, la cerramos
    if (seccion.classList.contains('open')) {
        seccion.classList.remove('open');
    } else {
        // Opcional: Cerrar las otras secciones primero (Efecto Acordeón Estricto)
        document.querySelectorAll('.menu-body').forEach(el => el.classList.remove('open'));

        // Abrir la seleccionada
        seccion.classList.add('open');
    }
}

function reproducirHover() {
    sonidoMenuHover.currentTime = 0; // Reinicia el audio al milisegundo 0
    sonidoMenuHover.play().catch(error => {
        // Los navegadores a veces bloquean el audio si el usuario no ha interactuado antes
        console.log("Esperando interacción para reproducir sonido");
    });
}


// Interacción con los objetos

function recolectarItem(jugador, itemSprite) {
    // 1. Obtenemos el ID del sprite
    const idItem = itemSprite.getData('itemId'); 
    
    // 2. Buscamos todas sus propiedades matemáticas en la base de datos
    const datosItem = itemsDB[idItem];

    // 3. Destruimos el sprite del mapa
    itemSprite.destroy();

    // 4. Reproducimos el sonido
    sfxItem.play();

    // 5. Guardamos el objeto en el inventario (haciendo una copia para no alterar la BD original)
    playerStats.inventario.push({ ...datosItem });

    // 6. Actualizamos la interfaz
    actualizarInventario();

    // 7. Mostramos el mensaje (ahora podemos leer si es un arma o un consumible)
    let textoMensaje = `¡Has encontrado: ${datosItem.nombre}!\n`;
    if (datosItem.tipo === 'arma') textoMensaje += `Daño: ${datosItem.atkMin}-${datosItem.atkMax}`;
    
    mostrarMensaje(textoMensaje);
}

// ------------------
// Sección de funciones de Batalla
//---------------

function actualizarInterfazBatalla() {
    // Cálculo de porcentajes para las barras CSS
    const porcenHP = (playerStats.hp / playerStats.hpMax) * 100;
    const porcenEN = (playerStats.energia / playerStats.energiaMax) * 100;

    // Aplicamos al CSS
    document.getElementById('hp-bar-fill').style.width = porcenHP + "%";
    document.getElementById('en-bar-fill').style.width = porcenEN + "%";

    // Si el HP es bajo, podemos cambiar el color a amarillo/rojo (Lógica condicional)
    const bar = document.getElementById('hp-bar-fill');
    if (porcenHP < 30) bar.style.background = "red";
    else if (porcenHP < 60) bar.style.background = "gold";
}

// Función para iniciar el combate
function iniciarCombate(enemigo) {
    // Clonamos un enemigo de prueba (luego lo puedes hacer dinámico según el sprite)
    enemigoActual = JSON.parse(JSON.stringify(enemigosDB['alien_glitch']));
    turnoJugador = true;

    // 1. Efecto visual de transición
    document.getElementById('game-container').style.filter = 'blur(5px) grayscale(50%)';

    // 2. Mostramos el div que estaba en 'display: none'
    document.getElementById('battle-screen').style.display = 'flex';
    

    // 3. Ocultamos los botones táctiles
    const controles = document.getElementById('mobile-controls');
    if (controles) controles.style.display = 'none';

    // 4. Transición musical
    bgmMundo.pause(); // Pausamos para que al volver siga donde se quedó
    bgmBatalla.play();

    // 5. Actualizamos los datos iniciales en la interfaz
    actualizarInterfazBatalla();
    mostrarMensaje(`¡Un ${enemigoActual.nombre} salvaje aparece!`);

    // 6. (Opcional) Podemos pasar datos del alien a la batalla
    console.log("Iniciando batalla contra el alien tipo: " + enemigo.texture.key);

    // Aquí podrías incluso cambiar la música o añadir un efecto visual
}

function ejecutarAccion(tipo) {
    if (!turnoJugador) return; // Si no es tu turno, los botones no hacen nada

    if (tipo === 'ataque') {
        // Llamamos a tu habilidad básica (el Golpe Lógico de coste 0)
        usarHabilidad('golpe_basico');
    } else if (tipo === 'energia') {
        meditar(); // Función para recuperar un poco de energía
    }
}

function meditar() {
    const recuperacion = 15;
    playerStats.energia = Math.min(playerStats.energia + recuperacion, playerStats.energiaMax);
    actualizarInterfazBatalla();
    mostrarMensaje("Has meditado. Recuperas 15 pts de Energía.");
    
    // IMPORTANTE: Meditar también consume tu turno
    turnoJugador = false;
    setTimeout(turnoDelEnemigo, 1500);
}

// Esta función se llama al presionar un botón de ataque
function usarHabilidad(idHabilidad) {
    if (!turnoJugador) return; // Evita que el jugador ataque fuera de su turno

    const habilidad = habilidadesDB[idHabilidad];

    // Verificar Energía
    if (playerStats.energia < habilidad.costoEnergia) {
        mostrarMensaje("No tienes suficiente energía para usar esta lógica.");
        return;
    }

    // Consumir energía
    playerStats.energia -= habilidad.costoEnergia;
    actualizarInterfazBatalla();

    // Calcular resultado
    const resultado = calcularDaño(habilidad);

    if (resultado.fallo) {
        mostrarMensaje(`¡Tu ${habilidad.nombre} falló! La lógica fue imprecisa.`);
    } else {
        enemigoActual.hp -= resultado.dañoFinal;
        if (enemigoActual.hp < 0) enemigoActual.hp = 0;
        
        let textoAtaque = `Usaste ${habilidad.nombre} y causaste ${resultado.dañoFinal} pts de daño.`;
        if (resultado.critico) textoAtaque = `¡GOLPE CRÍTICO!\n` + textoAtaque;
        
        mostrarMensaje(textoAtaque);
    }

    // Revisar si el enemigo murió
    if (enemigoActual.hp === 0) {
        setTimeout(victoriaCombate, 1500); // Lógica para ganar oro/xp
    } else {
        // Ceder turno
        turnoJugador = false;
        setTimeout(turnoDelEnemigo, 2000); // El enemigo responde en 2 segundos
    }
}

// Inteligencia Artificial Básica del Enemigo
function turnoDelEnemigo() {
    if (enemigoActual.hp <= 0) return; // Si el enemigo ya murió, no ataca

    // Fórmula simple: Atk Enemigo - Tu Defensa (mínimo 1 de daño)
    let dañoEnemigo = enemigoActual.atk - (playerStats.defensa + calcularBonosEquipo().defensa);
    if (dañoEnemigo < 1) dañoEnemigo = 1;

    playerStats.hp -= dañoEnemigo;
    if (playerStats.hp < 0) playerStats.hp = 0;

    // Actualizamos las barras visuales
    actualizarInterfazBatalla();
    mostrarMensaje(`El ${enemigoActual.nombre} lanza un ataque de interferencia: -${dañoEnemigo} HP.`);

    if (playerStats.hp === 0) {
        setTimeout(() => {
            mostrarMensaje("Tus sistemas han colapsado. GAME OVER.");
            // Aquí podrías reiniciar la página o volver al último punto guardado
        }, 1500);
    } else {
        // Vuelve a ser tu turno tras el mensaje
        turnoJugador = true;
    }
}

function calcularDaño(habilidad) {
    const bonos = calcularBonosEquipo();
    const fuerzaTotal = playerStats.fuerza + bonos.str;
    const suerteTotal = (playerStats.luc || 5) + bonos.luc;
    
    // 1. Arma (Si no hay arma, el ATK es 5 por defecto)
    const arma = playerStats.equipo.arma;
    let atkArma = 5; 
    let bonoCritArma = 0;

    if (arma) {
        // Obtenemos un número aleatorio entre el ATK Min y Max del arma
        atkArma = Math.floor(Math.random() * (arma.atkMax - arma.atkMin + 1)) + arma.atkMin;
        if (arma.bonos && arma.bonos.critDanio) bonoCritArma = arma.bonos.critDanio;
    }

    // 2. Probabilidad de Acierto
    const acierta = (Math.random() * 100) <= habilidad.precision;
    if (!acierta) return { fallo: true, dañoFinal: 0, critico: false };

    // 3. Daño Base (Aplicando el multiplicador de la habilidad)
    let dañoBase = (atkArma * (1.3 * fuerzaTotal)) - enemigoActual.def;
    dañoBase = dañoBase * habilidad.multiplicador;
    if (dañoBase < 1) dañoBase = 1; // El daño nunca es negativo o cero

    // 4. Cálculo de Crítico basado en LUC
    // Fórmula propuesta: 1 LUC = 2% de prob. Base de daño crítico = 50% (0.5) + (LUC * 5%)
    const probCritico = suerteTotal * 2; 
    let porcentajeDañoCritico = 0.50 + (suerteTotal * 0.05) + bonoCritArma;
    
    const esCritico = (Math.random() * 100) <= probCritico;
    
    let dañoFinal = esCritico ? dañoBase * (1 + porcentajeDañoCritico) : dañoBase;
    
    // Redondeamos para no tener decimales en la UI
    return { 
        fallo: false, 
        dañoFinal: Math.floor(dañoFinal), 
        critico: esCritico 
    };
}

function victoriaCombate() {
    // 1. Calculamos la recompensa (puedes hacerla proporcional al nivel del enemigo)
    const puntosGanados = 2; // Puntos de Lógica para distribuir
    const oroGanado = Math.floor(Math.random() * 20) + 10;
    
    // 2. Aplicamos la recompensa a tus estadísticas globales
    playerStats.puntosDisponibles += puntosGanados;
    playerStats.oro += oroGanado;

    // 3. Mostramos el mensaje de éxito en tu DIV personalizado
    mostrarMensaje(`¡VICTORIA! \nHas deshabilitado al alien. \nGanaste: ${puntosGanados} Puntos de Lógica y ${oroGanado} de Oro.`);
    
    // 4. Preparamos el cierre: al dar "Continuar" en el mensaje, volveremos al mapa
    pendienteCerrarCombate = true; 
    escapeExitoso = true; // Reutilizamos esta variable para que finalizarCombate() sepa que debe cerrar
    
    // Opcional: Sonido de victoria
    // sfxVictoria.play();
}

function intentarEscapar() {
    if (Math.random() < 0.5) {
        mostrarMensaje("¡Escape exitoso! Has logrado burlar al alien.");
        pendienteCerrarCombate = true; // Marcamos que al dar "Continuar" volvemos al mapa
    } else {
        mostrarMensaje("¡Escape fallido! El alien bloquea tu salida.");
        pendienteCerrarCombate = false;
    }
}

function finalizarCombate() {
    // 1. Ocultar pantalla de batalla
    document.getElementById('battle-screen').style.display = 'none';

    // 2. Quitar desenfoque del juego
    document.getElementById('game-container').style.filter = 'none';

    // 3. Mostrar controles táctiles (solo si no es PC)
    if (window.innerWidth < 1024) {
        document.getElementById('mobile-controls').style.display = 'grid';
    }

    // 4. Transición musical de regreso
    bgmBatalla.stop(); // La de batalla se detiene por completo
    bgmMundo.resume(); // La del mundo continúa

    // 5. Reanudar físicas y juego
    game.scene.scenes[0].physics.world.resume();

    // 6. Mover al jugador un poco para que no colisione de inmediato otra vez
    // Esto evita un bucle infinito de batalla
    player.x += 100;
}


// -----------------------------
// Funciones para los mensajes personalizados (en lugar de alert())
// ------------------------------
function mostrarMensaje(texto) {
    document.getElementById('alert-message').innerText = texto;
    document.getElementById('custom-alert').style.display = 'flex';
}

function cerrarNotificacion() {
    document.getElementById('custom-alert').style.display = 'none';

    // Si el escape fue exitoso, cerramos la batalla
    if (pendienteCerrarCombate) {
        finalizarCombate();
        pendienteCerrarCombate = false; // Reiniciamos la variable para futuras batallas
    }
}

// Función para configurar los controles táctiles (Lógica de eventos táctiles)
function configurarControlesTactiles() {
    const botones = [
        { id: 'btn-up', dir: 'up' },
        { id: 'btn-down', dir: 'down' },
        { id: 'btn-left', dir: 'left' },
        { id: 'btn-right', dir: 'right' }
    ];

    botones.forEach(b => {
        const elemento = document.getElementById(b.id);

        elemento.addEventListener('touchstart', (e) => {
            e.preventDefault();
            touchControls[b.dir] = true;
        });

        // 'touchend' para cuando suelta, 'touchcancel' por si entra una llamada o algo interrumpe
        const detener = (e) => {
            e.preventDefault();
            touchControls[b.dir] = false;
        };

        elemento.addEventListener('touchend', detener);
        elemento.addEventListener('touchcancel', detener);
    });
}

// Funciones para guardar y cargar el progreso del juego usando localStorage
function guardarProgreso() {
    localStorage.setItem('save_game', JSON.stringify(playerStats));
}

function cargarProgreso() {
    const data = localStorage.getItem('save_game');
    if (data) playerStats = JSON.parse(data);
}