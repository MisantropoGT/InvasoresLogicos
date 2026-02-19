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

// Objeto para almacenar las estadísticas del jugador
let playerStats = {
    nivel: 1,
    hp: 100,
    hpMax: 100,
    energia: 50,
    energiaMax: 50,
    fuerza: 10,
    defensa: 8,
    puntosDisponibles: 0,
    oro: 0,
    equipo: {
        arma: "Lápiz de Grafito", // Tu primera "arma" lógica
        armadura: "Bata de Docente"
    },
    inventario: []
};

function preload() {
    // 1. Cargar el JSON
    this.load.tilemapTiledJSON('mapa1', 'assets/images/mapa1.json');

    // 2. Cargar las imágenes
    // IMPORTANTE: Debes cargar la imagen que corresponde al tileset "Caminos"
    // y cualquier otra que hayas usado (como rural-tileset-tilex)
    this.load.image('terreno', 'assets/images/terreno.png');
    this.load.image('arboles', 'assets/images/arboles.png');
    this.load.image('casas', 'assets/images/casas.png');

    // 3. Cargar el sprite del jugador (Asegúrate de que el tamaño de cada frame sea correcto)
    this.load.spritesheet('player', 'assets/sprites/personaje1.png', {
        frameWidth: 32, frameHeight: 48
    });

    // 4. Cargar des sprites enemigos
    this.load.spritesheet('alien', 'assets/sprites/alien1.png', {
        frameWidth: 32, frameHeight: 32
    });
}

function create() {
    // 1. CREACIÓN DEL MUNDO (Reemplaza los gráficos de líneas anteriores)
    const map = this.make.tilemap({ key: 'mapa1' });

    // IMPORTANTE: El primer nombre debe ser el que aparece en Tiled (ej: "Edificios_Set")
    // El segundo es el apodo que pusimos en preload ('tiles_edificios')
    const tileset = map.addTilesetImage('terreno', 'terreno');
    const tilesetCasas = map.addTilesetImage('casas', 'casas');
    const tilesetArboles = map.addTilesetImage('arboles', 'arboles');
    //const tilesetArboles = map.addTilesetImage('Arboles', 'arboles');

    // Creamos las capas. Si en Tiled tu capa se llama "Suelo", aquí pones "Suelo"
    const capaFondo = map.createLayer('fondo', tileset);
    const capaCaminos = map.createLayer('caminos', tileset, 0, 0);
    const capaCasas = map.createLayer('casas', tilesetCasas, 0, 0);
    const capaDecoraciones = map.createLayer('Decoraciones', tilesetCasas);
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
    this.physics.add.collider(player, capaCasas, (sprite, tile) => {
        // 1. Verificamos que 'properties' exista para no romper el código
        if (tile.properties) {

            // Si usaste el campo "Class" de Tiled:
            if (tile.properties.class === 'collides') {
                console.log('Detectado por Clase');
            }

            // Si usaste un Atributo Personalizado (Booleano):
            if (tile.properties.collides === true) {
                console.log('Detectado por Atributo Personalizado');
            }
        }
    });

    // 4. ANIMACIONES (Nuevo: para que el personaje se mueva con animaciones)
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
    // 0. Efecto visual de transición
    document.getElementById('game-container').style.filter = 'blur(5px) grayscale(50%)';

    // 1. Mostramos el div que estaba en 'display: none'
    const pantallaBatalla = document.getElementById('battle-screen');
    pantallaBatalla.style.display = 'flex'; // Usamos flex porque así lo definimos en el CSS

    // Ocultamos los botones táctiles
    const controles = document.getElementById('mobile-controls');
    if (controles) controles.style.display = 'none';

    // 2. Actualizamos los datos iniciales en la interfaz
    actualizarInterfazBatalla();

    // 3. (Opcional) Podemos pasar datos del alien a la batalla
    console.log("Iniciando batalla contra el alien tipo: " + enemigo.texture.key);

    // Aquí podrías incluso cambiar la música o añadir un efecto visual
}

// Función para finalizar el combate y volver al juego
/*
function finalizarCombate() {
    // 1. Ocultamos la pantalla de batalla
    document.getElementById('battle-screen').style.display = 'none';
    
    // 2. Quitamos el desenfoque del juego
    document.getElementById('game-container').style.filter = 'none';
    
    // 3. Volvemos a mostrar los controles táctiles (solo si no es PC)
    if (window.innerWidth < 1024) {
        document.getElementById('mobile-controls').style.display = 'grid';
    }
    
    // 4. Reanudamos el mundo físico de Phaser
    // Necesitarás acceder a la escena actual de Phaser
    game.scene.scenes[0].physics.world.resume();
}
*/
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
    
    // 4. Reanudar físicas y juego
    game.scene.scenes[0].physics.world.resume();
    
    // 5. Mover al jugador un poco para que no colisione de inmediato otra vez
    // Esto evita un bucle infinito de batalla
    player.x += 100; 
}


// Funciones para los mensajes personalizados (en lugar de alert())
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