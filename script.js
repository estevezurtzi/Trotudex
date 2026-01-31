const PokedexState = {
    pokemon: {
        allData: [],
        filteredData: [],
        currentIndex: 0,
        favorites: new Set(),
        captured: new Set(),
    },
    ui: {
        soundEnabled: true,
        soundVolume: 1.0,
        shinyMode: false,
        femaleMode: false,
        currentRegion: 'all',
    },
    user: {
        current: null,
    },
    team: {
        current: Array(6).fill(null),
        saved: [],
    },
    comparison: {
        toCompare: [],
    },
    navigation: {
        history: [],
    },
    search: {
        debounceTimer: null,
    },

    getPokemon() { return this.pokemon.allData; },
    getFiltered() { return this.pokemon.filteredData; },
    getCurrentPokemon() { return this.pokemon.allData[this.pokemon.currentIndex]; },
    addFavorite(id) { this.pokemon.favorites.add(id); this.save(); },
    removeFavorite(id) { this.pokemon.favorites.delete(id); this.save(); },
    isFavorite(id) { return this.pokemon.favorites.has(id); },
    
    save() {
        localStorage.setItem('pokedex-sound', JSON.stringify(this.ui.soundEnabled));
        localStorage.setItem('pokedex-sound-volume', JSON.stringify(this.ui.soundVolume));
        localStorage.setItem('pokedex-theme', document.body.className);
        localStorage.setItem('pokedex-favorites-local', JSON.stringify([...this.pokemon.favorites]));
        localStorage.setItem('pokedex-shiny-mode', JSON.stringify(this.ui.shinyMode));
        localStorage.setItem('pokedex-female-mode', JSON.stringify(this.ui.femaleMode));
        localStorage.setItem('pokedex-comparison', JSON.stringify(this.comparison.toCompare));
        localStorage.setItem('pokedex-history', JSON.stringify(this.navigation.history));
    },

    load() {
        const soundSetting = localStorage.getItem('pokedex-sound');
        if (soundSetting !== null) this.ui.soundEnabled = JSON.parse(soundSetting);
        
        const volumeSetting = localStorage.getItem('pokedex-sound-volume');
        if (volumeSetting !== null) this.ui.soundVolume = JSON.parse(volumeSetting);
        
        const theme = localStorage.getItem('pokedex-theme');
        if (theme) document.body.className = theme;
        
        const favorites = localStorage.getItem('pokedex-favorites-local');
        if (favorites) this.pokemon.favorites = new Set(JSON.parse(favorites));
        
        const comparison = localStorage.getItem('pokedex-comparison');
        if (comparison) this.comparison.toCompare = JSON.parse(comparison);
        
        const history = localStorage.getItem('pokedex-history');
        if (history) this.navigation.history = JSON.parse(history);
        
        const shinyMode = localStorage.getItem('pokedex-shiny-mode');
        if (shinyMode !== null) this.ui.shinyMode = JSON.parse(shinyMode);
        
        const femaleMode = localStorage.getItem('pokedex-female-mode');
        if (femaleMode !== null) this.ui.femaleMode = JSON.parse(femaleMode);
    }
};

// Aliases para compatibilidad con código existente
let allPokemonData = [];
let currentPokemonIndex = 0;
let filteredPokemonData = [];
let favorites = PokedexState.pokemon.favorites;
let captured = PokedexState.pokemon.captured;
let soundEnabled = true;
let currentUser = null;
let currentRegion = 'all';
let currentShinyMode = false;
let currentFemaleMode = false;
let currentSpriteMode = '2d';
let currentTeam = PokedexState.team.current;
let savedTeams = PokedexState.team.saved;
let pokemonToCompare = PokedexState.comparison.toCompare;
let navigationHistory = PokedexState.navigation.history;

// Utilidad de debouncing para optimización
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Validación de formularios
const FormValidator = {
    validateEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    },
    
    validateUsername(username) {
        return username.length >= 3 && username.length <= 20;
    },
    
    validatePassword(password) {
        return password.length >= 6;
    },
    
    validatePasswordMatch(pwd1, pwd2) {
        return pwd1 === pwd2;
    },
    
    validateLoginForm() {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        
        if (!this.validateUsername(username)) {
            return { valid: false, error: 'Usuario debe tener 3-20 caracteres' };
        }
        if (!this.validatePassword(password)) {
            return { valid: false, error: 'Contraseña debe tener mínimo 6 caracteres' };
        }
        return { valid: true };
    },
    
    validateRegisterForm() {
        const username = document.getElementById('register-username').value.trim();
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;
        
        if (!this.validateUsername(username)) {
            return { valid: false, error: 'Usuario debe tener 3-20 caracteres' };
        }
        if (!this.validateEmail(email)) {
            return { valid: false, error: 'Email inválido' };
        }
        if (!this.validatePassword(password)) {
            return { valid: false, error: 'Contraseña debe tener mínimo 6 caracteres' };
        }
        if (!this.validatePasswordMatch(password, confirmPassword)) {
            return { valid: false, error: 'Las contraseñas no coinciden' };
        }
        return { valid: true };
    }
};

// Mapeo de tipos a español
const typeTranslations = {
    normal: 'Normal', fire: 'Fuego', water: 'Agua', electric: 'Eléctrico',
    grass: 'Planta', ice: 'Hielo', fighting: 'Lucha', poison: 'Veneno',
    ground: 'Tierra', flying: 'Volador', psychic: 'Psíquico', bug: 'Bicho',
    rock: 'Roca', ghost: 'Fantasma', dragon: 'Dragón', dark: 'Siniestro',
    steel: 'Acero', fairy: 'Hada'
};

// Nombres de estadísticas
const statNames = {
    'hp': 'PS', 'attack': 'Ataque', 'defense': 'Defensa',
    'special-attack': 'Ataque Especial', 'special-defense': 'Defensa Especial',
    'speed': 'Velocidad'
};

// URLs de los servicios PHP
const API_BASE = '/pokedex/php';
const ENDPOINTS = {
    LOGIN: `${API_BASE}/login.php`,
    REGISTER: `${API_BASE}/register.php`,
    LOGOUT: `${API_BASE}/logout.php`,
    UPDATE_PROFILE: `${API_BASE}/update_profile.php`,
    GET_USER_DATA: `${API_BASE}/get_user_data.php`,
    SAVE_POKEMON_DATA: `${API_BASE}/save_pokemon_data.php`
};

// Elementos de audio
const clickSound = document.getElementById('click-sound');
const hoverSound = document.getElementById('hover-sound');
const selectSound = document.getElementById('select-sound');
const pokemonCry = document.getElementById('pokemon-cry');

let globalVolume = 1.0;
const volumeGainNode = (() => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const gain = ctx.createGain();
    gain.gain.value = globalVolume;
    return gain;
})();

// Sistema de audio Web Audio API para sonidos UI
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function generateUISound(type) {
    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const volumeNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(volumeNode);
    volumeNode.connect(audioContext.destination);
    
    volumeNode.gain.value = globalVolume;
    
    switch(type) {
        case 'click':
            oscillator.frequency.value = 800;
            gainNode.gain.setValueAtTime(0.3, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            oscillator.start(now);
            oscillator.stop(now + 0.1);
            break;
        case 'hover':
            oscillator.frequency.value = 600;
            gainNode.gain.setValueAtTime(0.2, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
            oscillator.start(now);
            oscillator.stop(now + 0.05);
            break;
        case 'select':
            oscillator.frequency.setValueAtTime(600, now);
            oscillator.frequency.setValueAtTime(1000, now + 0.05);
            gainNode.gain.setValueAtTime(0.3, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            oscillator.start(now);
            oscillator.stop(now + 0.15);
            break;
    }
}

// Cache para movimientos con límite de tamaño
const movesCache = new Map();
const MAX_CACHE_SIZE = 100;

function addToMovesCache(key, value) {
    if (movesCache.size >= MAX_CACHE_SIZE) {
        const firstKey = movesCache.keys().next().value;
        movesCache.delete(firstKey);
    }
    movesCache.set(key, value);
}

// Base de datos de efectividad de tipos
const typeEffectiveness = {
    normal: { normal: 1, fire: 1, water: 1, electric: 1, grass: 1, ice: 1, fighting: 1, poison: 1, ground: 1, flying: 1, psychic: 1, bug: 1, rock: 0.5, ghost: 0, dragon: 1, dark: 1, steel: 0.5, fairy: 1 },
    fire: { normal: 1, fire: 0.5, water: 0.5, electric: 1, grass: 2, ice: 2, fighting: 1, poison: 1, ground: 1, flying: 1, psychic: 1, bug: 2, rock: 0.5, ghost: 1, dragon: 0.5, dark: 1, steel: 2, fairy: 1 },
    water: { normal: 1, fire: 2, water: 0.5, electric: 1, grass: 0.5, ice: 1, fighting: 1, poison: 1, ground: 2, flying: 1, psychic: 1, bug: 1, rock: 2, ghost: 1, dragon: 0.5, dark: 1, steel: 1, fairy: 1 },
    electric: { normal: 1, fire: 1, water: 2, electric: 0.5, grass: 0.5, ice: 1, fighting: 1, poison: 1, ground: 0, flying: 2, psychic: 1, bug: 1, rock: 1, ghost: 1, dragon: 0.5, dark: 1, steel: 1, fairy: 1 },
    grass: { normal: 1, fire: 0.5, water: 2, electric: 1, grass: 0.5, ice: 1, fighting: 1, poison: 0.5, ground: 2, flying: 0.5, psychic: 1, bug: 0.5, rock: 2, ghost: 1, dragon: 0.5, dark: 1, steel: 0.5, fairy: 1 },
    ice: { normal: 1, fire: 0.5, water: 0.5, electric: 1, grass: 2, ice: 0.5, fighting: 1, poison: 1, ground: 2, flying: 2, psychic: 1, bug: 1, rock: 1, ghost: 1, dragon: 2, dark: 1, steel: 0.5, fairy: 1 },
    fighting: { normal: 2, fire: 1, water: 1, electric: 1, grass: 1, ice: 2, fighting: 1, poison: 0.5, ground: 1, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dragon: 1, dark: 2, steel: 2, fairy: 0.5 },
    poison: { normal: 1, fire: 1, water: 1, electric: 1, grass: 2, ice: 1, fighting: 1, poison: 0.5, ground: 0.5, flying: 1, psychic: 1, bug: 1, rock: 0.5, ghost: 0.5, dragon: 1, dark: 1, steel: 0, fairy: 2 },
    ground: { normal: 1, fire: 2, water: 1, electric: 2, grass: 0.5, ice: 1, fighting: 1, poison: 2, ground: 1, flying: 0, psychic: 1, bug: 0.5, rock: 2, ghost: 1, dragon: 1, dark: 1, steel: 2, fairy: 1 },
    flying: { normal: 1, fire: 1, water: 1, electric: 0.5, grass: 2, ice: 1, fighting: 2, poison: 1, ground: 1, flying: 1, psychic: 1, bug: 2, rock: 0.5, ghost: 1, dragon: 1, dark: 1, steel: 0.5, fairy: 1 },
    psychic: { normal: 1, fire: 1, water: 1, electric: 1, grass: 1, ice: 1, fighting: 2, poison: 2, ground: 1, flying: 1, psychic: 0.5, bug: 1, rock: 1, ghost: 1, dragon: 1, dark: 0, steel: 0.5, fairy: 1 },
    bug: { normal: 1, fire: 0.5, water: 1, electric: 1, grass: 2, ice: 1, fighting: 0.5, poison: 0.5, ground: 1, flying: 0.5, psychic: 2, bug: 1, rock: 1, ghost: 0.5, dragon: 1, dark: 2, steel: 0.5, fairy: 0.5 },
    rock: { normal: 1, fire: 2, water: 1, electric: 1, grass: 1, ice: 2, fighting: 0.5, poison: 1, ground: 0.5, flying: 2, psychic: 1, bug: 2, rock: 1, ghost: 1, dragon: 1, dark: 1, steel: 0.5, fairy: 1 },
    ghost: { normal: 0, fire: 1, water: 1, electric: 1, grass: 1, ice: 1, fighting: 1, poison: 1, ground: 1, flying: 1, psychic: 2, bug: 1, rock: 1, ghost: 2, dragon: 1, dark: 0.5, steel: 1, fairy: 1 },
    dragon: { normal: 1, fire: 1, water: 1, electric: 1, grass: 1, ice: 1, fighting: 1, poison: 1, ground: 1, flying: 1, psychic: 1, bug: 1, rock: 1, ghost: 1, dragon: 2, dark: 1, steel: 0.5, fairy: 0 },
    dark: { normal: 1, fire: 1, water: 1, electric: 1, grass: 1, ice: 1, fighting: 0.5, poison: 1, ground: 1, flying: 1, psychic: 2, bug: 1, rock: 1, ghost: 2, dragon: 1, dark: 0.5, steel: 1, fairy: 0.5 },
    steel: { normal: 1, fire: 0.5, water: 0.5, electric: 0.5, grass: 1, ice: 2, fighting: 1, poison: 1, ground: 1, flying: 1, psychic: 1, bug: 1, rock: 2, ghost: 1, dragon: 1, dark: 1, steel: 0.5, fairy: 2 },
    fairy: { normal: 1, fire: 0.5, water: 1, electric: 1, grass: 1, ice: 1, fighting: 2, poison: 0.5, ground: 1, flying: 1, psychic: 1, bug: 1, rock: 1, ghost: 1, dragon: 2, dark: 2, steel: 0.5, fairy: 1 }
};

// ===== SISTEMA DE USUARIOS =====
class UserManager {
    async login(username, password) {
        return await this.apiCall(ENDPOINTS.LOGIN, { username, password });
    }

    async register(username, email, password) {
        return await this.apiCall(ENDPOINTS.REGISTER, { username, email, password });
    }

    async logout() {
        return await this.apiCall(ENDPOINTS.LOGOUT);
    }

    async updateProfile(updatedUser) {
        return await this.apiCall(ENDPOINTS.UPDATE_PROFILE, updatedUser);
    }

    async getUserData() {
        return await this.apiCall(ENDPOINTS.GET_USER_DATA);
    }

    async savePokemonData(favorites, captured) {
        return await this.apiCall(ENDPOINTS.SAVE_POKEMON_DATA, { favorites, captured });
    }

    async apiCall(endpoint, data = null) {
        const options = {
            method: data ? 'POST' : 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        };
        if (data) {
            options.body = JSON.stringify(data);
            console.log(`API Call: ${endpoint}`, 'Data:', data);
        }

        try {
            const response = await fetch(endpoint, options);
            const result = await response.json();
            
            if (!response.ok) {
                console.warn(`API Error (${response.status}):`, result);
            } else {
                console.log(`API Success (${response.status}):`, result);
            }
            
            return result;
        } catch (error) {
            console.error('API call failed:', error);
            return { success: false, message: 'Error de conexión' };
        }
    }

    generateDefaultAvatar(username) {
        const colors = ['#e3350d', '#30a7d7', '#f7d02c', '#78C850', '#A040A0', '#F85888'];
        const color = colors[username.length % colors.length];
        const initial = username.charAt(0).toUpperCase();
        
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
            <rect width="100" height="100" fill="${color}"/>
            <text x="50" y="60" font-family="Arial" font-size="40" text-anchor="middle" fill="white">${initial}</text>
        </svg>`;
        
        return 'data:image/svg+xml;base64,' + btoa(svg);
    }

    avatarToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    }
}

const userManager = new UserManager();

// ===== FUNCIONES PRINCIPALES =====

function initializeFromStorage() {
    PokedexState.load();
    
    soundEnabled = PokedexState.ui.soundEnabled;
    globalVolume = PokedexState.ui.soundVolume;
    volumeGainNode.gain.value = globalVolume;
    if (pokemonCry) pokemonCry.volume = globalVolume;
    currentShinyMode = PokedexState.ui.shinyMode;
    currentFemaleMode = PokedexState.ui.femaleMode;
    currentSpriteMode = PokedexState.ui.spriteMode || '2d';
    currentUser = PokedexState.user.current;
    currentTeam = PokedexState.team.current;
    pokemonToCompare = PokedexState.comparison.toCompare;
    navigationHistory = PokedexState.navigation.history;
    
    loadTeamFromStorage();
    loadTeamsFromStorage();
    
    updateCompareButton();
    updateSoundButton();
    updateThemeButton();
    updateShinyButton();
    updateGenderButton();
}

function saveToStorage() {
    PokedexState.ui.soundEnabled = soundEnabled;
    PokedexState.ui.soundVolume = globalVolume;
    PokedexState.ui.shinyMode = currentShinyMode;
    PokedexState.ui.femaleMode = currentFemaleMode;
    PokedexState.ui.spriteMode = currentSpriteMode;
    PokedexState.user.current = currentUser;
    PokedexState.team.current = currentTeam;
    PokedexState.comparison.toCompare = pokemonToCompare;
    PokedexState.navigation.history = navigationHistory;
    PokedexState.save();
}

// Actualizar botón de género
function updateGenderButton() {
    const btn = document.getElementById('female-toggle');
    const genderDisplay = document.getElementById('gender-display');
    if (btn) {
        if (currentFemaleMode) {
            btn.classList.remove('inactive');
            if (genderDisplay) genderDisplay.textContent = '♀';
        } else {
            btn.classList.add('inactive');
            if (genderDisplay) genderDisplay.textContent = '♂';
        }
        btn.removeEventListener('click', toggleGender);
        btn.addEventListener('click', toggleGender);
    }
}

// Obtener URL de imagen
function getPokemonImage(pokemon, useShiny = false, useFemale = false, spriteMode = '2d') {
    if (!pokemon)
        return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png`;

    const base = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
    let path = '';

    if (spriteMode === '3d') {
        if (useShiny) {
            path = `${base}/other/official-artwork/shiny/${pokemon.id}.png`;
        } else {
            path = `${base}/other/official-artwork/${pokemon.id}.png`;
        }
    } else {
        if (useShiny && useFemale) {
            path = `${base}/shiny/female/${pokemon.id}.png`;
        } else if (useShiny) {
            path = `${base}/shiny/${pokemon.id}.png`;
        } else if (useFemale) {
            path = `${base}/female/${pokemon.id}.png`;
        } else {
            path = `${base}/${pokemon.id}.png`;
        }
    }

    return path;
}



// Obtener URL de imagen 3D animada
function getPokemonImage3DAnimated(pokemon, useShiny = false, useFemale = false) {
    if (!pokemon) return null;

    const base = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
    let path = '';

    if (useShiny && useFemale) {
        path = `${base}/other/showdown/shiny/female/${pokemon.id}.gif`;
    } else if (useShiny) {
        path = `${base}/other/showdown/shiny/${pokemon.id}.gif`;
    } else if (useFemale) {
        path = `${base}/other/showdown/female/${pokemon.id}.gif`;
    } else {
        path = `${base}/other/showdown/${pokemon.id}.gif`;
    }

    return path;
}

function setupImageFallback(imgElement) {
    imgElement.onerror = function() {
        const current = this.src;

        // Si viene de "shiny/female", prueba "shiny" -> "female" -> base PNG
        if (current.includes('/shiny/female/')) {
            this.src = current.replace('/shiny/female/', '/shiny/');
            return;
        }
        if (current.includes('/shiny/')) {
            const idMatch = current.match(/\/(\d+)\.png$/);
            if (idMatch) {
                this.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${idMatch[1]}.png`;
            }
            return;
        }
        if (current.includes('/female/')) {
            const idMatch = current.match(/\/(\d+)\.png$/);
            if (idMatch) {
                this.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${idMatch[1]}.png`;
            }
            return;
        }
        
        if (current.includes('/showdown/shiny/female/')) {
            this.src = current.replace('/showdown/shiny/female/', '/showdown/shiny/');
            return;
        }
        if (current.includes('/showdown/shiny/')) {
            this.src = current.replace('/showdown/shiny/', '/showdown/');
            return;
        }
        if (current.includes('/showdown/female/')) {
            this.src = current.replace('/showdown/female/', '/showdown/');
            return;
        }
        // Si sigue fallando, intenta el PNG 2D (shiny/female/etc)
        if (current.includes('/other/showdown/')) {
            // transformar a equivalente 2D png si es posible
            const idMatch = current.match(/\/(\d+)\.gif$/);
            if (idMatch) {
                const id = idMatch[1];
                // si era shiny/female -> prueba shiny/female png; si no, prueba png normal
                if (current.includes('/showdown/shiny/female/')) {
                    this.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/female/${id}.png`;
                } else if (current.includes('/showdown/shiny/')) {
                    this.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${id}.png`;
                } else if (current.includes('/showdown/female/')) {
                    this.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/female/${id}.png`;
                } else {
                    this.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
                }
                return;
            }
        }

        // última alternativa: avatar por defecto
        this.src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png';
    };
}

// Traducir habilidades
async function translateAbility(abilityName) {
    try {
        const response = await fetch(`https://pokeapi.co/api/v2/ability/${abilityName}/`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const abilityData = await response.json();
        const spanishName = abilityData.names.find(name => name.language.name === 'es');
        return spanishName ? spanishName.name : abilityName;
    } catch (error) {
        return abilityName;
    }
}

// Crear elemento tipo badge
function createTypeElement(type, className = 'type-display') {
    const typeElement = document.createElement('span');
    typeElement.className = `${className} type-${type.toLowerCase()}`;
    typeElement.textContent = typeTranslations[type] || type;
    return typeElement;
}

// Toggle género de Pokémon
function toggleGender() {
    if (currentSpriteMode === '3d') return;
    
    currentFemaleMode = !currentFemaleMode;
    const btn = document.getElementById('female-toggle');
    const genderDisplay = document.getElementById('gender-display');
    if (btn) {
        if (currentFemaleMode) {
            btn.classList.remove('inactive');
            if (genderDisplay) genderDisplay.textContent = '♀';
        } else {
            btn.classList.add('inactive');
            if (genderDisplay) genderDisplay.textContent = '♂';
        }
    }
    
    const pokemon = allPokemonData[currentPokemonIndex];
    if (pokemon) {
        const mainImg = document.getElementById('detail-main-img');
        if (mainImg) {
            const newUrl = getPokemonImage(pokemon, currentShinyMode, currentFemaleMode, currentSpriteMode);
            mainImg.src = newUrl;
        }
    }
    
    saveToStorage();
}

function updateGenderButtonFor3D() {
    const btn = document.getElementById('female-toggle');
    if (!btn) return;
    
    if (currentSpriteMode === '3d') {
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
        btn.disabled = true;
        btn.title = 'El género no está disponible en modo 3D';
    } else {
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
        btn.disabled = false;
        btn.title = '';
    }
}

// Inicializar filtros con debouncing
function setupFilterSections() {
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('search-input');
    
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            playSound(clickSound);
            performSearch();
        });
    }
}

// Actualizar pestaña de tabla de tipos
function updateTypeChartTab() {
    const typeChartContainer = document.getElementById('type-chart-table');
    if (!typeChartContainer) return;

    typeChartContainer.innerHTML = '<div class="loading">Generando tabla de tipos...</div>';

    // Pequeño delay para permitir que se muestre el loading
    setTimeout(() => {
        generateTypeChart();
        setupTypeChartInteractions();
    }, 100);
}

// ===== SISTEMA DE TABLA DE TIPOS =====

// Generar equipo aleatorio
function generateRandomTeam() {
    if (allPokemonData.length === 0) {
        alert('Cargando Pokémon...');
        return;
    }
    
    const newTeam = Array(6).fill(null);
    const selectedIndices = new Set();
    
    for (let i = 0; i < 6; i++) {
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * allPokemonData.length);
        } while (selectedIndices.has(randomIndex));
        
        selectedIndices.add(randomIndex);
        newTeam[i] = allPokemonData[randomIndex];
    }
    
    currentTeam = newTeam;
    saveTeamToStorage();
    playSound(clickSound);
    displayTeam();
}

// Generar equipo por generación
function generateTeamByGeneration(generation) {
    if (allPokemonData.length === 0) return;
    
    const genRanges = {
        'gen1': [1, 151],
        'gen2': [152, 251],
        'gen3': [252, 386],
        'gen4': [387, 493],
        'gen5': [494, 649],
        'gen6': [650, 721],
        'gen7': [722, 809],
        'gen8': [810, 898],
        'gen9': [899, 1025]
    };
    
    const range = genRanges[generation] || [1, 151];
    const filtered = allPokemonData.filter(p => p.id >= range[0] && p.id <= range[1]);
    
    if (filtered.length < 6) {
        alert('No hay suficientes Pokémon en esta generación');
        return;
    }
    
    const newTeam = Array(6).fill(null);
    const selectedIndices = new Set();
    
    for (let i = 0; i < 6; i++) {
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * filtered.length);
        } while (selectedIndices.has(randomIndex));
        
        selectedIndices.add(randomIndex);
        newTeam[i] = filtered[randomIndex];
    }
    
    currentTeam = newTeam;
    saveTeamToStorage();
    playSound(clickSound);
    displayTeam();
}

// Generar equipo por tipo
function generateTeamByType(typeFilter) {
    if (allPokemonData.length === 0) return;
    
    const filtered = allPokemonData.filter(p => 
        p.types && p.types.some(t => t.type.name === typeFilter)
    );
    
    if (filtered.length < 6) {
        alert('No hay suficientes Pokémon de este tipo');
        return;
    }
    
    const newTeam = Array(6).fill(null);
    const selectedIndices = new Set();
    
    for (let i = 0; i < 6; i++) {
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * filtered.length);
        } while (selectedIndices.has(randomIndex));
        
        selectedIndices.add(randomIndex);
        newTeam[i] = filtered[randomIndex];
    }
    
    currentTeam = newTeam;
    saveTeamToStorage();
    playSound(clickSound);
    displayTeam();
}

// Inicializar sistema de tabla de tipos
function setupTypeChartSystem() {
    const typeChartBtn = document.getElementById('type-chart-btn');
    const typeChartModal = document.getElementById('type-chart-modal');
    
    if (!typeChartBtn || !typeChartModal) return;

    typeChartBtn.addEventListener('click', (e) => {
        playSound(clickSound);
        showTypeChartModal();
    });

    const closeButton = typeChartModal.querySelector('.close-button');
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            playSound(clickSound);
            typeChartModal.style.display = 'none';
        });
    }

    typeChartModal.addEventListener('click', (e) => {
        if (e.target === typeChartModal) {
            playSound(clickSound);
            typeChartModal.style.display = 'none';
        }
    });

    // Configurar controles de la tabla
    setupTypeChartControls();
}

// Mostrar modal de tabla de tipos
function showTypeChartModal() {
    const typeChartModal = document.getElementById('type-chart-modal');
    if (typeChartModal) {
        typeChartModal.style.display = 'flex';
        generateTypeChart();
    }
}

// Configurar controles de la tabla de tipos
function setupTypeChartControls() {
    // Toggle entre vistas de ataque y defensa
    document.querySelectorAll('.chart-view-toggle button').forEach(button => {
        button.addEventListener('click', () => {
            playSound(clickSound);
            document.querySelectorAll('.chart-view-toggle button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            generateTypeChart();
        });
    });

    // Filtro por efectividad
    const effectivenessFilter = document.getElementById('effectiveness-filter');
    if (effectivenessFilter) {
        effectivenessFilter.addEventListener('change', () => {
            playSound(clickSound);
            generateTypeChart();
        });
    }
}

// Generar la tabla de tipos
function generateTypeChart() {
    const container = document.getElementById('type-chart-table');
    if (!container) return;

    const currentView = document.querySelector('.chart-view-toggle .active')?.dataset.view || 'attack';
    const effectivenessFilter = document.getElementById('effectiveness-filter')?.value || 'all';

    let html = '<table class="type-chart"><thead><tr><th class="corner-cell">Tipo</th>';

    // Encabezados de columnas (tipos de defensa)
    Object.keys(typeTranslations).forEach(typeKey => {
        html += `<th class="type-header type-${typeKey}">${typeTranslations[typeKey]}</th>`;
    });

    html += '</tr></thead><tbody>';

    // Filas de datos
    Object.keys(typeTranslations).forEach(attackType => {
        const shouldShowRow = shouldShowTypeRow(attackType, effectivenessFilter, currentView);
        
        if (shouldShowRow) {
            html += `<tr><th class="type-header type-${attackType}">${typeTranslations[attackType]}</th>`;
            
            Object.keys(typeTranslations).forEach(defenseType => {
                const effectiveness = typeEffectiveness[attackType][defenseType];
                const shouldShowCell = shouldShowTypeCell(effectiveness, effectivenessFilter, currentView);
                
                if (shouldShowCell) {
                    const effectivenessClass = getEffectivenessClass(effectiveness);
                    const effectivenessText = getEffectivenessText(effectiveness);
                    html += `<td class="effectiveness-cell ${effectivenessClass}" data-attack="${attackType}" data-defense="${defenseType}" data-effectiveness="${effectiveness}">${effectivenessText}</td>`;
                } else {
                    html += '<td class="effectiveness-cell hidden"></td>';
                }
            });
            
            html += '</tr>';
        }
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

// Verificar si se debe mostrar una fila
function shouldShowTypeRow(type, effectivenessFilter, view) {
    if (effectivenessFilter === 'all') return true;
    
    const filterValue = parseFloat(effectivenessFilter);
    let hasMatchingEffectiveness = false;

    Object.keys(typeTranslations).forEach(otherType => {
        let effectiveness;
        if (view === 'attack') {
            effectiveness = typeEffectiveness[type][otherType];
        } else {
            effectiveness = typeEffectiveness[otherType][type];
        }
        
        if (Math.abs(effectiveness - filterValue) < 0.01) {
            hasMatchingEffectiveness = true;
        }
    });

    return hasMatchingEffectiveness;
}


// Verificar si se debe mostrar una celda
function shouldShowTypeCell(effectiveness, effectivenessFilter) {
    if (effectivenessFilter === 'all') return true;
    
    const filterValue = parseFloat(effectivenessFilter);
    return Math.abs(effectiveness - filterValue) < 0.01;
}


// Obtener clase CSS para la efectividad
function getEffectivenessClass(effectiveness) {
    if (effectiveness >= 4) return 'effectiveness-4';
    if (effectiveness >= 2) return 'effectiveness-2';
    if (effectiveness >= 1) return 'effectiveness-1';
    if (effectiveness >= 0.5) return 'effectiveness-05';
    if (effectiveness > 0) return 'effectiveness-025';
    return 'effectiveness-0';
}

// Obtener texto para la efectividad
function getEffectivenessText(effectiveness) {
    if (effectiveness >= 4) return '4×';
    if (effectiveness >= 2) return '2×';
    if (effectiveness >= 1) return '1×';
    if (effectiveness >= 0.5) return '0.5×';
    if (effectiveness > 0) return '0.25×';
    return '0×';
}

// Configurar interacciones de la tabla de tipos
function setupTypeChartInteractions() {
    // Tooltips y clics para las celdas
    document.querySelectorAll('.effectiveness-cell').forEach(cell => {
        if (!cell.classList.contains('hidden')) {
            const attackType = cell.dataset.attack;
            const defenseType = cell.dataset.defense;
            const effectiveness = parseFloat(cell.dataset.effectiveness);
            
            const attackName = typeTranslations[attackType];
            const defenseName = typeTranslations[defenseType];
            const effectivenessText = getEffectivenessDescription(effectiveness);
            
            cell.title = `${attackName} → ${defenseName}: ${effectivenessText}`;
            
            cell.addEventListener('click', () => {
                playSound(selectSound);
                showTypeEffectivenessDetails(attackType, defenseType, effectiveness);
            });
        }
    });
}

// Obtener descripción de la efectividad
function getEffectivenessDescription(effectiveness) {
    if (effectiveness >= 4) return 'Muy efectivo (4×)';
    if (effectiveness >= 2) return 'Efectivo (2×)';
    if (effectiveness >= 1) return 'Normal (1×)';
    if (effectiveness >= 0.5) return 'Poco efectivo (0.5×)';
    if (effectiveness > 0) return 'Muy poco efectivo (0.25×)';
    return 'Sin efecto (0×)';
}


// Mostrar detalles de efectividad entre tipos
function showTypeEffectivenessDetails(attackType, defenseType, effectiveness) {
    const attackName = typeTranslations[attackType];
    const defenseName = typeTranslations[defenseType];
    const effectivenessText = getEffectivenessDescription(effectiveness);
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.8); display: flex; justify-content: center;
        align-items: center; z-index: 10002;
    `;
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 450px; text-align: center;">
            <div class="modal-header">
                <h3>💥 Efectividad de Tipos</h3>
                <button class="close-button">&times;</button>
            </div>
            <div style="padding: 20px;">
                <div style="display: flex; justify-content: center; align-items: center; gap: 20px; margin-bottom: 25px;">
                    <div class="type-display">
                        <div class="type-badge type-${attackType}" style="font-size: 18px; margin-bottom: 5px;">${attackName}</div>
                        <div style="font-size: 12px; color: var(--pokedex-gray);">Tipo Ataque</div>
                    </div>
                    <span style="font-size: 24px; color: var(--pokedex-blue);">→</span>
                    <div class="type-display">
                        <div class="type-badge type-${defenseType}" style="font-size: 18px; margin-bottom: 5px;">${defenseName}</div>
                        <div style="font-size: 12px; color: var(--pokedex-gray);">Tipo Defensa</div>
                    </div>
                </div>
                
                <div class="effectiveness-display ${getEffectivenessClass(effectiveness)}" style="
                    font-size: 28px; font-weight: bold; padding: 20px; border-radius: 15px; margin-bottom: 20px;
                    border: 4px solid rgba(255,255,255,0.3); text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
                ">
                    ${getEffectivenessText(effectiveness)}
                </div>
                
                <p style="font-size: 18px; margin-bottom: 10px; font-weight: bold;">${effectivenessText}</p>
                <p style="color: var(--pokedex-gray); font-size: 14px; line-height: 1.5;">
                    Los movimientos de tipo <strong>${attackName}</strong> son 
                    <strong>${getEffectivenessAdjective(effectiveness)}</strong> 
                    contra Pokémon de tipo <strong>${defenseName}</strong>.
                </p>
            </div>
            <div style="text-align: center; margin-top: 20px;">
                <button class="pokedex-button" onclick="this.closest('.modal').remove()">Cerrar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const closeButton = modal.querySelector('.close-button');
    closeButton.addEventListener('click', () => {
        playSound(clickSound);
        modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            playSound(clickSound);
            modal.remove();
        }
    });
}

// Obtener adjetivo para la efectividad
function getEffectivenessAdjective(effectiveness) {
    if (effectiveness >= 4) return 'muy efectivos';
    if (effectiveness >= 2) return 'super efectivos';
    if (effectiveness >= 1) return 'neutrales';
    if (effectiveness >= 0.5) return 'poco efectivos';
    if (effectiveness > 0) return 'muy poco efectivos';
    return 'inefectivos';
}

// Traducir movimientos
async function translateMove(moveName) {
    if (movesCache.has(moveName)) return movesCache.get(moveName);
    
    try {
        const response = await fetch(`https://pokeapi.co/api/v2/move/${moveName}/`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const moveData = await response.json();
        const spanishName = moveData.names.find(name => name.language.name === 'es');
        const name = spanishName ? spanishName.name : moveName;
        
        const moveInfo = {
            name,
            type: moveData.type.name,
            power: moveData.power || '-',
            accuracy: moveData.accuracy || '-',
            pp: moveData.pp || '-',
            damageClass: moveData.damage_class.name,
            description: moveData.flavor_text_entries?.find(entry => entry.language.name === 'es')?.flavor_text || 'Descripción no disponible'
        };
        
        movesCache.set(moveName, moveInfo);
        return moveInfo;
    } catch (error) {
        const moveInfo = { name: moveName, type: 'normal', power: '-', accuracy: '-', pp: '-', damageClass: 'physical', description: 'Descripción no disponible' };
        movesCache.set(moveName, moveInfo);
        return moveInfo;
    }
}

async function loadSinglePokemon(id, region) {
    try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const pokemonData = await response.json();
        
        let name = pokemonData.name;
        let description = 'Descripción no disponible';
        let species = 'Pokémon';
        let abilities = pokemonData.abilities.map(a => a.ability.name);
        
        let eggGroups = [];
        let genderRate = null;
        let captureRate = null;
        let bodyShape = null;
        let isLegendary = false;
        let isMythical = false;

        try {
            const speciesResponse = await fetch(pokemonData.species.url);
            if (speciesResponse.ok) {
                const speciesData = await speciesResponse.json();
                
                const spanishName = speciesData.names.find(n => n.language.name === 'es');
                if (spanishName) name = spanishName.name;
                
                const spanishDesc = speciesData.flavor_text_entries.find(entry => entry.language.name === 'es');
                if (spanishDesc) description = spanishDesc.flavor_text.replace(/\f/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
                
                const spanishGenus = speciesData.genera.find(genus => genus.language.name === 'es');
                if (spanishGenus) species = spanishGenus.genus;
                
                const abilitiesPromises = pokemonData.abilities.map(async (abilityInfo) => {
                    return await translateAbility(abilityInfo.ability.name);
                });
                abilities = await Promise.all(abilitiesPromises);

                eggGroups = speciesData.egg_groups ? speciesData.egg_groups.map(eg => eg.name) : [];
                genderRate = speciesData.gender_rate;
                captureRate = speciesData.capture_rate;
                bodyShape = speciesData.shape ? speciesData.shape.name : null;
                isLegendary = speciesData.is_legendary || false;
                isMythical = speciesData.is_mythical || false;
            }
        } catch (speciesError) {
            console.warn(`No se pudo cargar especie para ${id}:`, speciesError);
        }
        
        const pokemon = {
            id: pokemonData.id,
            name: name,
            englishName: pokemonData.name,
            types: pokemonData.types.map(typeInfo => typeInfo.type.name),
                stats: pokemonData.stats.reduce((acc, stat) => {
                    acc[stat.stat.name] = stat.base_stat;
                    return acc;
                }, {}),            
            height: pokemonData.height,
            weight: pokemonData.weight,
            abilities: abilities,
            moves: pokemonData.moves.map(move => move.move.name),
            sprites: pokemonData.sprites,
            species: species,
            description: description,
            region: region,
            eggGroups: eggGroups,
            genderRate: genderRate,
            captureRate: captureRate,
            bodyShape: bodyShape,
            isLegendary: isLegendary,
            isMythical: isMythical
        };
        
        return pokemon;
    } catch (error) {
        console.error(`Error cargando Pokémon ${id}:`, error);
        return {
            id: id,
            name: `Pokémon ${id}`,
            englishName: `pokemon-${id}`,
            types: ['normal'],
            stats: { hp: 50, attack: 50, defense: 50, 'special-attack': 50, 'special-defense': 50, speed: 50 },
            height: 1,
            weight: 10,
            abilities: ['Estática'],
            moves: ['placaje'],
            sprites: { front_default: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png` },
            species: 'Pokémon normal',
            description: `Pokémon número ${id}`,
            region: region,
            eggGroups: [],
            genderRate: null,
            captureRate: null,
            bodyShape: null,
            isLegendary: false,
            isMythical: false
        };
    }
}

// Cargar todos los Pokémon (versión optimizada)
async function fetchPokemonData() {
    const grid = document.getElementById("pokemon-grid");
    if (!grid) return console.error("❌ No se encontró el contenedor pokemon-grid.");

    if (allPokemonData.length > 0) {
        renderPokemonList(allPokemonData);
        showPokemonDetails(0);
        return;
    }

    grid.innerHTML = `
        <div class="loading">
            Cargando Pokémon...<br>
            <div class="loading-progress">
                <div class="loading-progress-bar" style="width: 0%"></div>
            </div>
        </div>
    `;

    const regions = [
        { name: "kanto", start: 1, end: 151 },
        { name: "johto", start: 152, end: 251 },
        { name: "hoenn", start: 252, end: 386 },
        { name: "sinnoh", start: 387, end: 493 },
        { name: "teselia", start: 494, end: 649 },
        { name: "kalos", start: 650, end: 721 },
        { name: "alola", start: 722, end: 809 },
        { name: "galar", start: 810, end: 898 },
        { name: "paldea", start: 899, end: 1025 },
    ];

    const totalToLoad = regions.reduce((sum, r) => sum + (r.end - r.start + 1), 0);
    let loaded = 0;

    console.log(`🔄 Iniciando carga de ${totalToLoad} Pokémon...`);

    for (const region of regions) {
        console.log(`🌍 Cargando región: ${region.name}`);

        // Cargar por lotes (batch) de 20 Pokémon simultáneamente
        for (let i = region.start; i <= region.end; i += 20) {
            const batch = [];
            for (let j = i; j < i + 20 && j <= region.end; j++) {
                batch.push(loadSinglePokemon(j, region.name));
            }

            const results = await Promise.allSettled(batch);
            results.forEach(result => {
                if (result.status === "fulfilled") {
                    const pokemon = result.value;
                    allPokemonData.push(pokemon);
                    addPokemonToGrid(pokemon);
                }
                loaded++;
            });

            // Actualizar barra de progreso
            const progress = Math.round((loaded / totalToLoad) * 100);
            const bar = grid.querySelector(".loading-progress-bar");
            if (bar) bar.style.width = `${progress}%`;

            // Pequeño delay para no saturar la API
            await new Promise(res => setTimeout(res, 200));
        }
    }

    // Ordenar y guardar datos
    allPokemonData.sort((a, b) => a.id - b.id);
    filteredPokemonData = [...allPokemonData];
    saveToStorage();

    console.log(`✅ Carga completada (${loaded}/${totalToLoad} Pokémon)`);

    // Mostrar el primer Pokémon
    renderPokemonList(allPokemonData);
    showPokemonDetails(0);
}

// Añadir Pokémon a la grilla
function addPokemonToGrid(pokemon) {
    const grid = document.getElementById('pokemon-grid');
    if (!grid) return;
    
    const existingCard = grid.querySelector(`.pokemon-card[data-id="${pokemon.id}"]`);
    if (existingCard) return;
    
    let classNames = `pokemon-card ${favorites.has(pokemon.id) ? 'favorite' : ''} ${captured.has(pokemon.id) ? 'captured' : ''} ${isPokemonInTeam(pokemon.id) ? 'in-team' : ''}`;
    if (pokemon.isLegendary) classNames += ' legendary';
    if (pokemon.isMythical) classNames += ' mythical';
    
    const card = document.createElement('div');
    card.className = classNames;
    card.dataset.id = pokemon.id;
    card.dataset.region = pokemon.region;
    
    const imageUrl = getPokemonImage(pokemon, currentShinyMode, false, currentSpriteMode);
    
    const regionLetters = {
        'kanto': 'K', 'johto': 'J', 'hoenn': 'H', 'sinnoh': 'S',
        'teselia': 'T', 'kalos': 'X', 'alola': 'A', 'galar': 'G', 'paldea': 'P'
    };
    const regionLetter = regionLetters[pokemon.region] || '?';

    card.innerHTML = `
        <div class="region-badge" data-region="${pokemon.region}">${regionLetter}</div>
        <img class="pokemon-img" src="${imageUrl}" alt="${pokemon.name}" loading="eager">
        <div class="pokemon-id">#${pokemon.id.toString().padStart(3, '0')}</div>
        <div class="pokemon-name">${pokemon.name}</div>
    `;
    
    const imgElement = card.querySelector('.pokemon-img');
    setupImageFallback(imgElement);
    
    card.addEventListener('mouseenter', () => playSound(hoverSound));
    card.addEventListener('click', () => {
        playSound(selectSound);
        const pokemonIndex = allPokemonData.findIndex(p => p.id === pokemon.id);
        if (pokemonIndex !== -1) showPokemonDetails(pokemonIndex);
    });
    
    grid.appendChild(card);
}

function isPokemonInTeam(pokemonId) {
    return currentTeam.some(slot => slot && slot.id === pokemonId);
}

// Mostrar detalles del Pokémon
async function showPokemonDetails(index) {
    if (currentPokemonIndex === index && allPokemonData[index]) return;
    currentPokemonIndex = index;
    currentFemaleMode = false;

    const pokemon = allPokemonData[index];
    if (!pokemon) return;

    addToHistory(index);
    saveToStorage();
    playPokemonCry(pokemon);

    const detailContainer = document.getElementById('pokemon-detail');
    const imageUrl = getPokemonImage(pokemon, currentShinyMode, currentFemaleMode, currentSpriteMode);

    const regionNames = {
        kanto: 'Kanto', johto: 'Johto', hoenn: 'Hoenn', sinnoh: 'Sinnoh',
        teselia: 'Teselia', kalos: 'Kalos', alola: 'Alola', galar: 'Galar', paldea: 'Paldea'
    };
    const regionName = regionNames[pokemon.region] || pokemon.region;

    const translatedTypes = pokemon.types.map(type => typeTranslations[type] || type);

    detailContainer.innerHTML = `
        <div class="detail-header">
            <div class="detail-img-container">
                <img class="detail-img" id="detail-main-img" src="${imageUrl}" alt="${pokemon.name}">
            </div>
            <div class="detail-title">
                <div class="detail-name">${pokemon.name}</div>
                <div class="detail-id">#${pokemon.id.toString().padStart(3, '0')}</div>
                <div class="detail-region">Región: ${regionName}</div>
                <div class="detail-actions">
                    <button id="favorite-btn" class="pokedex-button small ${favorites.has(pokemon.id) ? 'active' : ''}">
                        <span class="button-icon">${favorites.has(pokemon.id) ? '★' : '☆'}</span> Favorito
                    </button>
                    <button id="team-add-btn" class="pokedex-button small team-add-btn">
                        <span class="button-icon">⚔️</span> Equipo
                    </button>
                    <button id="pokemon-cry-btn" class="pokedex-button small" style="background-color: #2ecc71;">
                        <span class="button-icon">🔊</span> Grito
                    </button>
                    <button id="female-toggle" class="pokedex-button small ${currentFemaleMode ? '' : 'inactive'}">
                        <span id="gender-display">${currentFemaleMode ? '♀' : '♂'}</span> Género
                    </button>
                    <button id="view-3d-animated-btn" class="pokedex-button small" style="display: ${currentSpriteMode === '3d' ? 'flex' : 'none'}; background-color: #9933cc;">
                        <span class="button-icon">🎬</span> 3D Animado
                    </button>
                </div>
            </div>
        </div>
        <div class="detail-types">
            ${pokemon.types.map((t, idx) => `<span class="type-badge type-${t} type-clickable" data-type="${t}">${translatedTypes[idx]}</span>`).join('')}
        </div>
        <p>Altura: ${pokemon.height / 10} m | Peso: ${pokemon.weight / 10} kg</p>
    `;

    const mainImg = document.getElementById('detail-main-img');
    setupImageFallback(mainImg);

    document.getElementById('favorite-btn').addEventListener('click', () => toggleFavorite(pokemon.id));
    document.getElementById('team-add-btn').addEventListener('click', () => addToTeam(pokemon));
    document.getElementById('pokemon-cry-btn').addEventListener('click', () => playPokemonCry(pokemon));
    
    const view3dBtn = document.getElementById('view-3d-animated-btn');
    if (view3dBtn) {
        view3dBtn.addEventListener('click', () => showPokemon3DAnimated(pokemon));
    }
    
    document.querySelectorAll('.type-clickable').forEach(badge => {
        badge.addEventListener('click', (e) => {
            const type = e.target.getAttribute('data-type');
            filterByTypeClick(type);
        });
    });
    
    updateGenderButton();
    updateGenderButtonFor3D();

    updateInfoTab(pokemon);
    updateEvolutionTab(pokemon);
    updateMovesTab(pokemon);
    updateWeaknessesTab(pokemon);
    updateTeamButtonState();
    updateTypeChartTab();
    updateStatsDisplay(pokemon);
}

function setupComparisonButton() {
    const compareBtn = document.getElementById('compare-btn');
    if (compareBtn) {
        compareBtn.addEventListener('click', () => {
            playSound(clickSound);
            showCompareModal();
        });
    }
}

function getTypeRelationship() {
    const selected = document.querySelector('input[name="type-mode"]:checked');
    return selected ? selected.value : 'any';
}

// ===== SISTEMA DE QUIZ =====

// Variables globales para el quiz
let quizState = {
    active: false,
    currentMode: null,
    currentDifficulty: 'medium',
    currentQuestion: 0,
    totalQuestions: 15,
    score: 0,
    lives: 3,
    startTime: null,
    questions: [],
    userAnswers: [],
    achievements: []
};

// Inicializar sistema de quiz
function setupQuizSystem() {
    const quizBtn = document.getElementById('quiz-btn');
    const quizModal = document.getElementById('quiz-modal');
    
    if (!quizBtn || !quizModal) return;

    // Botón flotante del quiz
    quizBtn.addEventListener('click', (e) => {
        playSound(clickSound);
        showQuizModal();
    });

    // Cerrar modal
    const closeButton = quizModal.querySelector('.close-button');
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            playSound(clickSound);
            quizModal.style.display = 'none';
            resetQuiz();
        });
    }

    quizModal.addEventListener('click', (e) => {
        if (e.target === quizModal) {
            playSound(clickSound);
            quizModal.style.display = 'none';
            resetQuiz();
        }
    });

    // Modos de quiz
    document.querySelectorAll('.quiz-mode-card').forEach(card => {
        card.addEventListener('click', () => {
            const mode = card.dataset.mode;
            selectQuizMode(mode);
        });
    });

    // Dificultades
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            quizState.currentDifficulty = e.target.dataset.difficulty;
        });
    });

    // Botones de acción
    document.getElementById('quiz-skip').addEventListener('click', skipQuestion);
    document.getElementById('quiz-hint').addEventListener('click', showHint);
    document.getElementById('quiz-restart').addEventListener('click', restartQuiz);
    document.getElementById('quiz-change-mode').addEventListener('click', showModeSelection);
    document.getElementById('quiz-leaderboard').addEventListener('click', showLeaderboard);
    document.getElementById('leaderboard-back').addEventListener('click', showResultsScreen);
    // Tabs del leaderboard
    document.querySelectorAll('.leaderboard-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const mode = e.target.dataset.mode;
            showLeaderboardForMode(mode);
        });
    });

    loadQuizStats();
}

function showResults() {
    setQuizScreen('quiz-results-screen');
    const timeTaken = Math.floor((Date.now() - quizState.startTime) / 1000);
    showResultsScreen(timeTaken);
}

// Mostrar modal del quiz
function showQuizModal() {
    const quizModal = document.getElementById('quiz-modal');
    if (quizModal) {
        quizModal.style.display = 'flex';
        showModeSelection();
        updateQuizStats();
    }
}

// Mostrar selección de modo
function showModeSelection() {
    setQuizScreen('quiz-mode-selection');
    loadQuizStats();
}

// Seleccionar modo de quiz
function selectQuizMode(mode) {
    playSound(selectSound);
    quizState.currentMode = mode;
    startQuiz();
}

// Iniciar quiz
function startQuiz() {
    quizState.active = true;
    quizState.currentQuestion = 0;
    quizState.score = 0;
    quizState.lives = 3;
    quizState.startTime = Date.now();
    quizState.questions = generateQuizQuestions();
    quizState.userAnswers = [];

    setQuizScreen('quiz-question-screen');
    showQuestion();
    updateHearts();
}

// Generar preguntas del quiz
function generateQuizQuestions() {
    const questions = [];
    const questionCount = quizState.totalQuestions;
    
    for (let i = 0; i < questionCount; i++) {
        let question;
        
        switch (quizState.currentMode) {
            case 'types':
                question = generateTypeQuestion();
                break;
            case 'names':
                question = generateNameQuestion();
                break;
            case 'stats':
                question = generateStatQuestion();
                break;
            case 'evolutions':
                question = generateEvolutionQuestion();
                break;
            case 'abilities':
                question = generateAbilityQuestion();
                break;
            case 'moves':
                question = generateMoveQuestion();
                break;
            case 'generations':
                question = generateGenerationQuestion();
                break;
            case 'comparative':
                question = generateComparativeQuestion();
                break;
            case 'weaknesses':
                question = generateWeaknessQuestion();
                break;
            default:
                question = generateTypeQuestion();
        }
        
        questions.push(question);
    }
    
    return questions;
}

// Generar pregunta de tipos
function generateTypeQuestion() {
    const types = Object.keys(typeTranslations);
    const attackingType = types[Math.floor(Math.random() * types.length)];
    
    // Encontrar tipos efectivos
    const effectiveTypes = types.filter(defenseType => 
        typeEffectiveness[attackingType][defenseType] > 1
    );
    
    // Encontrar tipos no efectivos
    const nonEffectiveTypes = types.filter(defenseType => 
        typeEffectiveness[attackingType][defenseType] <= 1
    );
    
    let options, correctAnswer;
    
    if (quizState.currentDifficulty === 'easy') {
        // Fácil: 1 correcta, 3 incorrectas muy fáciles
        correctAnswer = effectiveTypes[0];
        const easyWrongTypes = nonEffectiveTypes.filter(t => 
            typeEffectiveness[attackingType][t] < 0.5
        );
        options = [
            correctAnswer,
            ...shuffleArray(easyWrongTypes.length >= 3 ? easyWrongTypes : nonEffectiveTypes).slice(0, 3)
        ];
    } else if (quizState.currentDifficulty === 'medium') {
        // Medio: opciones similares, tipos que resisten
        correctAnswer = effectiveTypes[Math.floor(Math.random() * effectiveTypes.length)];
        const resistantTypes = types.filter(t => 
            typeEffectiveness[attackingType][t] < 1 && typeEffectiveness[attackingType][t] > 0
        );
        options = [
            correctAnswer,
            ...shuffleArray(resistantTypes.length >= 3 ? resistantTypes : nonEffectiveTypes).slice(0, 3)
        ];
    } else {
        // Difícil: opciones muy similares - super efectivos vs muy resistentes
        correctAnswer = effectiveTypes[Math.floor(Math.random() * effectiveTypes.length)];
        const resistantTypes = types.filter(t => 
            typeEffectiveness[attackingType][t] < 1 && typeEffectiveness[attackingType][t] > 0
        );
        const otherEffective = effectiveTypes.filter(t => t !== correctAnswer);
        
        options = [correctAnswer];
        if (otherEffective.length > 0) {
            options.push(otherEffective[Math.floor(Math.random() * otherEffective.length)]);
        }
        if (resistantTypes.length > 0) {
            options.push(resistantTypes[Math.floor(Math.random() * resistantTypes.length)]);
        }
        while (options.length < 4) {
            const random = nonEffectiveTypes[Math.floor(Math.random() * nonEffectiveTypes.length)];
            if (!options.includes(random)) options.push(random);
        }
    }
    
    return {
        type: 'types',
        question: `¿Contra qué tipo es efectivo el tipo ${typeTranslations[attackingType]}?`,
        options: shuffleArray(options.slice(0, 4)).map(opt => typeTranslations[opt]),
        correctAnswer: typeTranslations[correctAnswer],
        explanation: `El tipo ${typeTranslations[attackingType]} es efectivo contra: ${effectiveTypes.map(t => typeTranslations[t]).join(', ')}`,
        metadata: { attackingType }
    };
}

// Generar pregunta de nombres
function generateNameQuestion() {
    let pokemonPool = [...allPokemonData];
    
    // Filtrar por dificultad
    if (quizState.currentDifficulty === 'easy') {
        pokemonPool = pokemonPool.filter(p => p.id <= 151); // Solo Kanto
    } else if (quizState.currentDifficulty === 'medium') {
        pokemonPool = pokemonPool.filter(p => p.id <= 493); // Hasta Sinnoh
    }
    // Difícil: todos los Pokémon
    
    const correctPokemon = pokemonPool[Math.floor(Math.random() * pokemonPool.length)];
    
    let similarPokemon;
    if (quizState.currentDifficulty === 'easy') {
        // Fácil: Pokémon del mismo tipo pero claramente diferentes
        similarPokemon = pokemonPool.filter(p => 
            p.id !== correctPokemon.id && 
            p.types.some(t => correctPokemon.types.includes(t)) &&
            Math.abs(p.id - correctPokemon.id) > 10
        ).slice(0, 3);
    } else if (quizState.currentDifficulty === 'medium') {
        // Medio: Pokémon similares en tipo y aspecto
        similarPokemon = pokemonPool.filter(p => 
            p.id !== correctPokemon.id && 
            p.types.some(t => correctPokemon.types.includes(t))
        ).slice(0, 3);
    } else {
        // Difícil: Pokémon evolucionados anteriores/posteriores o mismo tipo muy similares
        const evolvingRelated = pokemonPool.filter(p => 
            p.id !== correctPokemon.id && 
            (Math.abs(p.id - correctPokemon.id) <= 2 || p.types.every(t => correctPokemon.types.includes(t)))
        );
        similarPokemon = evolvingRelated.length >= 3 ? evolvingRelated.slice(0, 3) : 
            pokemonPool.filter(p => 
                p.id !== correctPokemon.id && 
                p.types.some(t => correctPokemon.types.includes(t))
            ).slice(0, 3);
    }
    
    const options = shuffleArray([
        correctPokemon,
        ...similarPokemon
    ]);
    
    const useSilhouette = quizState.currentDifficulty === 'hard' ? 
        Math.random() > 0.3 : 
        (quizState.currentDifficulty === 'medium' ? Math.random() > 0.6 : false);
    
    return {
        type: 'names',
        question: useSilhouette ? '¿Qué Pokémon es este?' : `¿Cómo se llama este Pokémon?`,
        options: options.map(p => p.name),
        correctAnswer: correctPokemon.name,
        explanation: `Este es ${correctPokemon.name} (#${correctPokemon.id}), un Pokémon de tipo ${correctPokemon.types.map(t => typeTranslations[t]).join(' y ')}.`,
        image: getPokemonImage(correctPokemon, false),
        useSilhouette: useSilhouette,
        metadata: { pokemonId: correctPokemon.id }
    };
}

// Generar pregunta de stats
function generateStatQuestion() {
    const stats = ['attack', 'defense', 'sp_attack', 'sp_defense', 'speed', 'hp'];
    const randomStat = stats[Math.floor(Math.random() * stats.length)];
    
    const pokemon = allPokemonData[Math.floor(Math.random() * allPokemonData.length)];
    
    let similarPokemon;
    if (quizState.currentDifficulty === 'easy') {
        // Fácil: diferencia clara (>50 puntos)
        similarPokemon = allPokemonData.filter(p => 
            p.id !== pokemon.id && 
            Math.abs(p.stats[randomStat] - pokemon.stats[randomStat]) > 50
        ).slice(0, 3);
    } else if (quizState.currentDifficulty === 'medium') {
        // Medio: diferencia moderada (20-50 puntos)
        similarPokemon = allPokemonData.filter(p => 
            p.id !== pokemon.id && 
            Math.abs(p.stats[randomStat] - pokemon.stats[randomStat]) > 20 &&
            Math.abs(p.stats[randomStat] - pokemon.stats[randomStat]) <= 50
        ).slice(0, 3);
    } else {
        // Difícil: muy similar (<20 puntos)
        similarPokemon = allPokemonData.filter(p => 
            p.id !== pokemon.id && 
            Math.abs(p.stats[randomStat] - pokemon.stats[randomStat]) < 20 &&
            p.stats[randomStat] >= pokemon.stats[randomStat] - 10
        ).slice(0, 3);
    }
    
    // Si no hay suficientes, completar con cualquier otro
    if (similarPokemon.length < 3) {
        similarPokemon = allPokemonData.filter(p => p.id !== pokemon.id).slice(0, 3 - similarPokemon.length);
    }
    
    const options = shuffleArray([
        pokemon,
        ...similarPokemon.slice(0, 3)
    ]);
    
    return {
        type: 'stats',
        question: `¿Qué Pokémon tiene ${pokemon.stats[randomStat]} de ${statNames[randomStat]}?`,
        options: options.map(p => p.name),
        correctAnswer: pokemon.name,
        explanation: `${pokemon.name} tiene ${pokemon.stats[randomStat]} ${statNames[randomStat]}. Stats totales: ${Object.values(pokemon.stats).reduce((a,b) => a+b, 0)}`,
        metadata: { pokemonId: pokemon.id, stat: randomStat, statValue: pokemon.stats[randomStat] }
    };
}

// Generar pregunta de evoluciones
function generateEvolutionQuestion() {
    // Buscar Pokémon con evoluciones
    const evolvingPokemon = allPokemonData.filter(p => {
        // Simplificado: Pokémon que evolucionan (ID no muy alto y no es evolucion final)
        return p.id < 500 && p.id % 3 === 0;
    });
    
    const pokemon = evolvingPokemon[Math.floor(Math.random() * evolvingPokemon.length)];
    const evolution = allPokemonData.find(p => p.id === pokemon.id + 1) || pokemon;
    
    const options = shuffleArray([
        evolution,
        ...allPokemonData.filter(p => 
            p.id !== evolution.id && 
            p.types.some(t => evolution.types.includes(t))
        ).slice(0, 3)
    ]);
    
    return {
        type: 'evolutions',
        question: `¿En qué Pokémon evoluciona ${pokemon.name}?`,
        options: options.map(p => p.name),
        correctAnswer: evolution.name,
        explanation: `${pokemon.name} evoluciona en ${evolution.name}.`,
        metadata: { fromId: pokemon.id, toId: evolution.id }
    };
}

// Generar pregunta de habilidades
function generateAbilityQuestion() {
    const pokemonWithAbilities = allPokemonData.filter(p => p.abilities && p.abilities.length > 0);
    const pokemon = pokemonWithAbilities[Math.floor(Math.random() * pokemonWithAbilities.length)];
    const correctAbility = pokemon.abilities[Math.floor(Math.random() * pokemon.abilities.length)];
    
    // Generar opciones difíciles - habilidades similares
    const allAbilities = new Set();
    allPokemonData.forEach(p => {
        if (p.abilities) p.abilities.forEach(a => allAbilities.add(a));
    });
    
    const similarPokemon = pokemonWithAbilities.filter(p => 
        p.id !== pokemon.id && 
        p.types.some(t => pokemon.types.includes(t)) &&
        p.abilities && p.abilities.length > 0
    ).slice(0, 3);
    
    let options = [correctAbility];
    similarPokemon.forEach(p => {
        if (p.abilities) {
            const ability = p.abilities[Math.floor(Math.random() * p.abilities.length)];
            if (ability !== correctAbility) options.push(ability);
        }
    });
    
    // Si no hay suficientes opciones, completar con habilidades aleatorias
    if (options.length < 4) {
        const allAbilitiesArray = Array.from(allAbilities);
        while (options.length < 4) {
            const randomAbility = allAbilitiesArray[Math.floor(Math.random() * allAbilitiesArray.length)];
            if (!options.includes(randomAbility)) options.push(randomAbility);
        }
    }
    
    return {
        type: 'abilities',
        question: `¿Cuál es una habilidad de ${pokemon.name}?`,
        options: shuffleArray(options.slice(0, 4)),
        correctAnswer: correctAbility,
        explanation: `${pokemon.name} puede tener la habilidad: ${pokemon.abilities.join(', ')}`,
        metadata: { pokemonId: pokemon.id }
    };
}

// Generar pregunta de movimientos
function generateMoveQuestion() {
    const pokemonWithMoves = allPokemonData.filter(p => p.moves && p.moves.length > 0);
    const pokemon = pokemonWithMoves[Math.floor(Math.random() * pokemonWithMoves.length)];
    
    const correctMove = pokemon.moves[Math.floor(Math.random() * pokemon.moves.length)];
    
    // Generar opciones difíciles
    const otherPokemon = pokemonWithMoves.filter(p => 
        p.id !== pokemon.id && 
        p.moves && p.moves.length > 0
    ).slice(0, 3);
    
    let options = [correctMove];
    otherPokemon.forEach(p => {
        if (p.moves) {
            const move = p.moves[Math.floor(Math.random() * p.moves.length)];
            if (move !== correctMove) options.push(move);
        }
    });
    
    // Completar si es necesario
    while (options.length < 4) {
        const randomMove = pokemon.moves[Math.floor(Math.random() * pokemon.moves.length)];
        if (!options.includes(randomMove)) options.push(randomMove);
    }
    
    return {
        type: 'moves',
        question: `¿Cuál es un movimiento que puede aprender ${pokemon.name}?`,
        options: shuffleArray(options.slice(0, 4)),
        correctAnswer: correctMove,
        explanation: `${pokemon.name} puede aprender: ${pokemon.moves.slice(0, 5).join(', ')}...`,
        metadata: { pokemonId: pokemon.id }
    };
}

// Generar pregunta de generaciones
function generateGenerationQuestion() {
    const generations = {
        1: { name: 'I (Rojo/Azul)', range: [1, 151] },
        2: { name: 'II (Oro/Plata)', range: [152, 251] },
        3: { name: 'III (Rubí/Zafiro)', range: [252, 386] },
        4: { name: 'IV (Diamante/Perla)', range: [387, 493] },
        5: { name: 'V (Blanco/Negro)', range: [494, 649] },
        6: { name: 'VI (X/Y)', range: [650, 721] },
        7: { name: 'VII (Sol/Luna)', range: [722, 809] },
        8: { name: 'VIII (Espada/Escudo)', range: [810, 898] }
    };
    
    const genNumber = quizState.currentDifficulty === 'easy' ? 
        Math.floor(Math.random() * 3) + 1 :
        Math.floor(Math.random() * 8) + 1;
    
    const gen = generations[genNumber];
    const pokemon = allPokemonData.filter(p => p.id >= gen.range[0] && p.id <= gen.range[1]);
    const correctPokemon = pokemon[Math.floor(Math.random() * pokemon.length)];
    
    const otherPokemon = allPokemonData.filter(p => 
        p.id !== correctPokemon.id && 
        !(p.id >= gen.range[0] && p.id <= gen.range[1])
    ).slice(0, 3);
    
    const options = shuffleArray([
        correctPokemon,
        ...otherPokemon
    ]);
    
    return {
        type: 'generations',
        question: `¿Cuál de estos Pokémon pertenece a la Generación ${genNumber}?`,
        options: options.map(p => p.name),
        correctAnswer: correctPokemon.name,
        explanation: `${correctPokemon.name} pertenece a la Generación ${gen.name}`,
        metadata: { generation: genNumber, pokemonId: correctPokemon.id }
    };
}

// Generar pregunta comparativa
function generateComparativeQuestion() {
    const types = ['attack', 'defense', 'sp_attack', 'sp_defense', 'speed', 'hp'];
    const stat = types[Math.floor(Math.random() * types.length)];
    const statNames = { attack: 'Ataque', defense: 'Defensa', sp_attack: 'Ataque Especial', sp_defense: 'Defensa Especial', speed: 'Velocidad', hp: 'PS' };
    
    const pokemon1 = allPokemonData[Math.floor(Math.random() * allPokemonData.length)];
    const pokemon2 = allPokemonData[Math.floor(Math.random() * allPokemonData.length)];
    
    if (pokemon1.id === pokemon2.id) {
        return generateComparativeQuestion();
    }
    
    const stat1 = pokemon1.stats[stat];
    const stat2 = pokemon2.stats[stat];
    
    const isHigher = stat1 > stat2;
    const correctAnswer = isHigher ? pokemon1.name : pokemon2.name;
    const question = isHigher ? 
        `¿Cuál tiene más ${statNames[stat]}: ${pokemon1.name} (${stat1}) o ${pokemon2.name} (${stat2})?` :
        `¿Cuál tiene más ${statNames[stat]}: ${pokemon1.name} (${stat1}) o ${pokemon2.name} (${stat2})?`;
    
    const options = shuffleArray([pokemon1.name, pokemon2.name]);
    
    return {
        type: 'comparative',
        question: question,
        options: options,
        correctAnswer: correctAnswer,
        explanation: `${correctAnswer} tiene ${Math.abs(stat1 - stat2)} puntos más de ${statNames[stat]}`,
        metadata: { pok1: pokemon1.id, pok2: pokemon2.id, stat: stat }
    };
}

// Generar pregunta de debilidades
function generateWeaknessQuestion() {
    const types = Object.keys(typeTranslations);
    const defendingType = types[Math.floor(Math.random() * types.length)];
    
    // Encontrar tipos que son efectivos contra este tipo
    const superEffectiveAgainst = types.filter(attackType => 
        typeEffectiveness[attackType] && typeEffectiveness[attackType][defendingType] > 1
    );
    
    let options, correctAnswer;
    
    if (quizState.currentDifficulty === 'easy') {
        correctAnswer = superEffectiveAgainst[0];
        options = [
            correctAnswer,
            ...types.filter(t => !superEffectiveAgainst.includes(t)).slice(0, 3)
        ];
    } else {
        // Difícil: mezclar entre efectivos y no efectivos
        const nonEffective = types.filter(t => !superEffectiveAgainst.includes(t));
        correctAnswer = superEffectiveAgainst[0];
        options = shuffleArray([
            ...superEffectiveAgainst.slice(0, 2),
            ...nonEffective.slice(0, 2)
        ]);
    }
    
    return {
        type: 'weaknesses',
        question: `¿De qué tipo es débil un Pokémon ${typeTranslations[defendingType]}?`,
        options: shuffleArray(options.slice(0, 4)).map(t => typeTranslations[t]),
        correctAnswer: typeTranslations[correctAnswer],
        explanation: `Los Pokémon de tipo ${typeTranslations[defendingType]} son débiles a: ${superEffectiveAgainst.map(t => typeTranslations[t]).join(', ')}`,
        metadata: { defendingType }
    };
}

// Mostrar pregunta actual
function showQuestion() {
    if (quizState.currentQuestion >= quizState.questions.length) {
        endQuiz();
        return;
    }

    const question = quizState.questions[quizState.currentQuestion];
    const progress = ((quizState.currentQuestion + 1) / quizState.totalQuestions) * 100;

    // Actualizar progreso
    document.getElementById('quiz-progress-text').textContent = 
        `Pregunta ${quizState.currentQuestion + 1}/${quizState.totalQuestions}`;
    document.getElementById('quiz-progress-bar').style.width = `${progress}%`;
    document.getElementById('current-score').textContent = quizState.score;

    // Mostrar pregunta
    document.getElementById('quiz-question').textContent = question.question;

    // Mostrar imagen si existe
    const imageContainer = document.getElementById('quiz-image-container');
    const pokemonImage = document.getElementById('quiz-pokemon-image');
    const silhouette = document.getElementById('quiz-silhouette');
    
    if (question.image) {
        imageContainer.style.display = 'block';
        pokemonImage.src = question.image;
        pokemonImage.alt = question.correctAnswer;
        
        if (question.useSilhouette) {
            silhouette.style.display = 'block';
        } else {
            silhouette.style.display = 'none';
        }
    } else {
        imageContainer.style.display = 'none';
    }

    // Mostrar opciones
    const optionsContainer = document.getElementById('quiz-options');
    optionsContainer.innerHTML = '';

    question.options.forEach((option, index) => {
        const optionElement = document.createElement('div');
        optionElement.className = 'quiz-option';
        optionElement.textContent = option;
        optionElement.addEventListener('click', () => selectAnswer(option, question.correctAnswer));
        optionsContainer.appendChild(optionElement);
    });

    updateHearts();
}

// Seleccionar respuesta
function selectAnswer(selected, correct) {
    const options = document.querySelectorAll('.quiz-option');
    options.forEach(opt => opt.classList.add('disabled'));

    const isCorrect = selected === correct;
    const currentQuestion = quizState.questions[quizState.currentQuestion];

    // Guardar respuesta del usuario
    quizState.userAnswers.push({
        question: currentQuestion.question,
        selected,
        correct: currentQuestion.correctAnswer,
        isCorrect,
        explanation: currentQuestion.explanation
    });

    if (isCorrect) {
        // Respuesta correcta - sistema mejorado de puntos
        playSound(selectSound);
        
        // Puntos base según dificultad
        let points = 10;
        if (quizState.currentDifficulty === 'hard') {
            points = 20;
        } else if (quizState.currentDifficulty === 'medium') {
            points = 15;
        }
        
        // Bonificación por racha (máximo 50%)
        const streak = quizState.userAnswers.filter(a => a.isCorrect).length;
        const streakBonus = Math.min(points * 0.5, Math.floor(streak / 3) * 5);
        
        quizState.score += Math.floor(points + streakBonus);
        
        options.forEach(opt => {
            if (opt.textContent === correct) {
                opt.classList.add('correct');
            }
        });
        
        // Efecto visual de acierto
        document.getElementById('quiz-question').style.color = 'var(--pokedex-green)';
    } else {
        // Respuesta incorrecta
        playSound(clickSound);
        quizState.lives--;
        
        options.forEach(opt => {
            if (opt.textContent === correct) {
                opt.classList.add('correct');
            }
            if (opt.textContent === selected) {
                opt.classList.add('incorrect');
            }
        });
        
        // Efecto visual de error
        document.getElementById('quiz-question').style.color = 'var(--pokedex-red)';
    }

    updateHearts();

    // Siguiente pregunta después de un delay
    setTimeout(() => {
        quizState.currentQuestion++;
        if (quizState.lives > 0 && quizState.currentQuestion < quizState.totalQuestions) {
            showQuestion();
        } else {
            endQuiz();
        }
    }, 2000);
}

// Saltar pregunta
function skipQuestion() {
    playSound(clickSound);
    quizState.currentQuestion++;
    
    // Guardar como respuesta incorrecta
    const currentQuestion = quizState.questions[quizState.currentQuestion - 1];
    quizState.userAnswers.push({
        question: currentQuestion.question,
        selected: 'Saltada',
        correct: currentQuestion.correctAnswer,
        isCorrect: false,
        explanation: currentQuestion.explanation,
        skipped: true
    });
    
    if (quizState.currentQuestion < quizState.totalQuestions) {
        showQuestion();
    } else {
        endQuiz();
    }
}

// Mostrar pista
function showHint() {
    if (quizState.score >= 5) {
        playSound(selectSound);
        quizState.score -= 5;
        
        const currentQuestion = quizState.questions[quizState.currentQuestion];
        alert(`💡 Pista: ${getHintForQuestion(currentQuestion)}`);
        
        document.getElementById('current-score').textContent = quizState.score;
    } else {
        alert('No tienes suficientes puntos para una pista');
    }
}

// Obtener pista para pregunta
function getHintForQuestion(question) {
    const pokemon = allPokemonData.find(p => p.name === question.correctAnswer);
    
    switch (question.type) {
        case 'types': {
            const typeData = typeEffectiveness[question.metadata.attackingType];
            const superEffective = Object.keys(typeData).filter(t => typeData[t] > 1);
            return `El tipo ${typeTranslations[question.metadata.attackingType]} es super efectivo contra: ${superEffective.map(t => typeTranslations[t]).slice(0, 2).join(', ')}...`;
        }
        case 'names': {
            if (!pokemon) return '¿Empieza con estas letras?';
            const name = pokemon.name;
            const hint = name.charAt(0) + '*'.repeat(name.length - 2) + name.charAt(name.length - 1);
            return `Pista: ${hint} (${pokemon.types.map(t => typeTranslations[t]).join('/')})`;
        }
        case 'stats':
            if (!pokemon) return `Revisa su número de Pokédex`;
            return `#${pokemon.id} - Tipo: ${pokemon.types.map(t => typeTranslations[t]).join('/')} - ${statNames[question.metadata.stat]}: ${question.metadata.statValue}`;
        case 'evolutions':
            if (!pokemon) return `Mira los números de Pokédex`;
            return `Número: #${pokemon.id} - Es la evolución de Pokémon anteriores`;
        case 'abilities':
            if (!pokemon) return `Piensa en sus características especiales`;
            return `Una habilidad de este Pokémon: "${pokemon.abilities[0]}"`;
        case 'moves':
            if (!pokemon) return `Revisa qué Pokémon puede aprender este movimiento`;
            const moves = pokemon.moves.slice(0, 2).join(', ');
            return `Puede aprender: ${moves}...`;
        case 'generations':
            if (!pokemon) return `Generación ${Math.ceil(pokemon.id / 100)}`;
            return `Número: #${pokemon.id} - Es de la Generación ${Math.ceil(pokemon.id / 151)}`;
        case 'comparative':
            return `Compara los valores numéricos mostrados`;
        case 'weaknesses': {
            const types = Object.keys(typeTranslations);
            const defendingType = question.metadata.defendingType;
            const superEffective = types.filter(t => 
                typeEffectiveness[t] && typeEffectiveness[t][defendingType] > 1
            );
            return `Las debilidades del tipo ${typeTranslations[defendingType]} incluyen: ${superEffective.slice(0, 2).map(t => typeTranslations[t]).join(', ')}...`;
        }
        default:
            return '¡Tú puedes! Piensa bien en la respuesta';
    }
}

// Finalizar quiz
function endQuiz() {
    quizState.active = false;
    const timeTaken = Math.floor((Date.now() - quizState.startTime) / 1000);
    
    setQuizScreen('quiz-results-screen');
    showResultsScreen(timeTaken);
    saveQuizResults(timeTaken);
    checkAchievements();
}

// Mostrar pantalla de resultados
function showResultsScreen(timeTaken) {
    const correctCount = quizState.userAnswers.filter(a => a.isCorrect).length;
    const accuracy = Math.round((correctCount / quizState.totalQuestions) * 100);
    
    // Actualizar estadísticas principales
    document.getElementById('final-score').textContent = quizState.score;
    document.getElementById('correct-count').textContent = `${correctCount}/${quizState.totalQuestions}`;
    document.getElementById('accuracy-percent').textContent = `${accuracy}%`;
    document.getElementById('time-taken').textContent = `${timeTaken}s`;
    
    // Icono y título según puntuación
    const resultsIcon = document.getElementById('results-icon');
    const resultsTitle = document.getElementById('results-title');
    
    if (accuracy >= 80) {
        resultsIcon.textContent = '🎉';
        resultsTitle.textContent = '¡Excelente!';
    } else if (accuracy >= 60) {
        resultsIcon.textContent = '👍';
        resultsTitle.textContent = '¡Buen trabajo!';
    } else {
        resultsIcon.textContent = '💪';
        resultsTitle.textContent = '¡Sigue practicando!';
    }
    
    document.getElementById('results-subtitle').textContent = 
        `Has completado el quiz de ${quizState.currentMode}`;
    
    // Mostrar desglose de respuestas
    showAnswersBreakdown();
}

// Mostrar desglose de respuestas
function showAnswersBreakdown() {
    const breakdownContainer = document.getElementById('answers-breakdown');
    breakdownContainer.innerHTML = '';
    
    quizState.userAnswers.forEach((answer, index) => {
        const answerItem = document.createElement('div');
        answerItem.className = 'answer-item';
        
        answerItem.innerHTML = `
            <div class="answer-status ${answer.isCorrect ? 'correct' : 'incorrect'}">
                ${answer.isCorrect ? '✓' : '✗'}
            </div>
            <div class="answer-text">
                <strong>P${index + 1}:</strong> ${answer.question}
                <br>
                <small>Tu respuesta: ${answer.selected} ${answer.skipped ? '(Saltada)' : ''}</small>
                ${!answer.isCorrect ? `<br><small>Correcta: ${answer.correct}</small>` : ''}
            </div>
        `;
        
        breakdownContainer.appendChild(answerItem);
    });
}

// Verificar logros
function checkAchievements() {
    const correctCount = quizState.userAnswers.filter(a => a.isCorrect).length;
    const accuracy = Math.round((correctCount / quizState.totalQuestions) * 100);
    const achievements = [];
    const timeTaken = Math.floor((Date.now() - quizState.startTime) / 1000);
    
    // Logros basados en precisión
    if (accuracy === 100) {
        achievements.push({
            icon: '🏆',
            name: 'Maestro Pokémon',
            description: 'Respuestas todas correctas'
        });
    }
    
    if (accuracy >= 90 && accuracy < 100) {
        achievements.push({
            icon: '⭐',
            name: 'Experto',
            description: 'Más del 90% de aciertos'
        });
    }
    
    if (accuracy >= 80 && accuracy < 90) {
        achievements.push({
            icon: '🌟',
            name: 'Entrenador Avanzado',
            description: 'Más del 80% de aciertos'
        });
    }
    
    if (quizState.lives === 3) {
        achievements.push({
            icon: '❤️',
            name: 'Invencible',
            description: 'Completado sin perder vidas'
        });
    }
    
    // Logros de racha
    let maxStreak = 0;
    let currentStreak = 0;
    quizState.userAnswers.forEach(answer => {
        if (answer.isCorrect) {
            currentStreak++;
            maxStreak = Math.max(maxStreak, currentStreak);
        } else {
            currentStreak = 0;
        }
    });
    
    if (maxStreak >= 10) {
        achievements.push({
            icon: '🔥',
            name: 'En Racha',
            description: `${maxStreak} aciertos seguidos`
        });
    }
    
    // Logros de puntuación
    if (quizState.score >= 300) {
        achievements.push({
            icon: '💰',
            name: 'Magnate de Puntos',
            description: `${Math.floor(quizState.score)} puntos acumulados`
        });
    } else if (quizState.score >= 200) {
        achievements.push({
            icon: '💵',
            name: 'Generoso',
            description: `${Math.floor(quizState.score)} puntos acumulados`
        });
    }
    
    // Logros de velocidad
    if (timeTaken <= 60) {
        achievements.push({
            icon: '⚡',
            name: 'Rayo',
            description: 'Completado en menos de 1 minuto'
        });
    } else if (timeTaken <= 120) {
        achievements.push({
            icon: '🚀',
            name: 'Veloz',
            description: 'Completado en menos de 2 minutos'
        });
    }
    
    // Logros de modo difícil
    if (quizState.currentDifficulty === 'hard' && accuracy >= 70) {
        achievements.push({
            icon: '💎',
            name: 'Campeón Implacable',
            description: 'Modo Difícil completado con 70%+ precisión'
        });
    }
    
    // Mostrar logros si hay alguno
    if (achievements.length > 0) {
        const container = document.getElementById('achievements-container');
        const list = document.getElementById('achievements-list');
        
        list.innerHTML = '';
        achievements.forEach(achievement => {
            const item = document.createElement('div');
            item.className = 'achievement-item';
            item.innerHTML = `
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-desc">${achievement.description}</div>
            `;
            list.appendChild(item);
        });
        
        container.style.display = 'block';
        quizState.achievements = achievements;
    }
}

// Mostrar leaderboard
function showLeaderboard() {
    setQuizScreen('quiz-leaderboard-screen');
    showLeaderboardForMode('types');
}

// Mostrar leaderboard para modo específico
function showLeaderboardForMode(mode) {
    const list = document.getElementById('leaderboard-list');
    const leaderboard = getLeaderboardForMode(mode);
    
    // Actualizar tabs activos
    document.querySelectorAll('.leaderboard-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.mode === mode);
    });
    
    list.innerHTML = '';
    
    if (leaderboard.length === 0) {
        list.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--pokedex-gray);">No hay puntuaciones aún</div>';
        return;
    }
    
    leaderboard.forEach((entry, index) => {
        const item = document.createElement('div');
        item.className = 'leaderboard-item';
        
        item.innerHTML = `
            <div class="leaderboard-rank ${index < 3 ? 'top-3' : ''}">${index + 1}</div>
            <div class="leaderboard-user">
                <img src="${entry.avatar}" alt="${entry.username}" class="leaderboard-avatar">
                <span>${entry.username}</span>
            </div>
            <div class="leaderboard-score">${entry.score}</div>
        `;
        
        list.appendChild(item);
    });
}

// Obtener leaderboard para modo
function getLeaderboardForMode(mode) {
    const stored = localStorage.getItem(`pokedex-leaderboard-${mode}`);
    if (stored) {
        return JSON.parse(stored).sort((a, b) => b.score - a.score).slice(0, 10);
    }
    return [];
}

// Guardar resultados del quiz
function saveQuizResults(timeTaken) {
    if (!currentUser) return;
    
    const results = {
        mode: quizState.currentMode,
        difficulty: quizState.currentDifficulty,
        score: quizState.score,
        correctAnswers: quizState.userAnswers.filter(a => a.isCorrect).length,
        totalQuestions: quizState.totalQuestions,
        timeTaken: timeTaken,
        date: new Date().toISOString(),
        achievements: quizState.achievements
    };
    
    // Guardar en localStorage
    let userQuizzes = JSON.parse(localStorage.getItem(`pokedex-quizzes-${currentUser.id}`) || '[]');
    userQuizzes.push(results);
    localStorage.setItem(`pokedex-quizzes-${currentUser.id}`, JSON.stringify(userQuizzes));
    
    // Actualizar leaderboard
    updateLeaderboard(results);
    
    // Actualizar estadísticas
    updateQuizStats();
}

// Actualizar leaderboard
function updateLeaderboard(results) {
    const leaderboardKey = `pokedex-leaderboard-${results.mode}`;
    let leaderboard = JSON.parse(localStorage.getItem(leaderboardKey) || '[]');
    
    const existingIndex = leaderboard.findIndex(entry => 
        entry.userId === currentUser.id && entry.difficulty === results.difficulty
    );
    
    const leaderboardEntry = {
        userId: currentUser.id,
        username: currentUser.username,
        avatar: currentUser.avatar,
        score: results.score,
        difficulty: results.difficulty,
        date: results.date
    };
    
    if (existingIndex !== -1) {
        // Actualizar si el score es mayor
        if (results.score > leaderboard[existingIndex].score) {
            leaderboard[existingIndex] = leaderboardEntry;
        }
    } else {
        leaderboard.push(leaderboardEntry);
    }
    
    // Ordenar y limitar a top 10
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 10);
    
    localStorage.setItem(leaderboardKey, JSON.stringify(leaderboard));
}

// Cargar estadísticas del quiz
function loadQuizStats() {
    if (!currentUser) return;
    
    const quizzes = JSON.parse(localStorage.getItem(`pokedex-quizzes-${currentUser.id}`) || '[]');
    updateQuizStats(quizzes);
}

// Actualizar estadísticas mostradas
function updateQuizStats(quizzes = null) {
    if (!currentUser) {
        quizzes = JSON.parse(localStorage.getItem('pokedex-quizzes-guest') || '[]');
    } else {
        quizzes = quizzes || JSON.parse(localStorage.getItem(`pokedex-quizzes-${currentUser.id}`) || '[]');
    }
    
    const totalQuizzes = quizzes.length;
    const highScore = quizzes.length > 0 ? Math.max(...quizzes.map(q => q.score)) : 0;
    
    const totalQuestions = quizzes.reduce((sum, quiz) => sum + quiz.totalQuestions, 0);
    const correctAnswers = quizzes.reduce((sum, quiz) => sum + quiz.correctAnswers, 0);
    const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    
    document.getElementById('total-quizzes').textContent = totalQuizzes;
    document.getElementById('high-score').textContent = highScore;
    document.getElementById('correct-answers').textContent = `${accuracy}%`;
}

// Reiniciar quiz
function restartQuiz() {
    startQuiz();
}

// Resetear quiz
function resetQuiz() {
    quizState = {
        active: false,
        currentMode: null,
        currentDifficulty: 'medium',
        currentQuestion: 0,
        totalQuestions: 15,
        score: 0,
        lives: 3,
        startTime: null,
        questions: [],
        userAnswers: [],
        achievements: []
    };
}

// Actualizar corazones de vida
function updateHearts() {
    const container = document.getElementById('hearts-container');
    container.innerHTML = '';
    
    for (let i = 0; i < 3; i++) {
        const heart = document.createElement('span');
        heart.className = `heart ${i < quizState.lives ? '' : 'lost'}`;
        heart.textContent = '❤️';
        container.appendChild(heart);
    }
}

// Establecer pantalla activa del quiz
function setQuizScreen(screenName) {
    document.querySelectorAll('.quiz-screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenName).classList.add('active');
}

// Función auxiliar para barajar array
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Actualizar pestaña de información
function updateInfoTab(pokemon) {
    let genderRatioText = '-';
    if (pokemon.genderRate !== null && pokemon.genderRate !== undefined) {
        if (pokemon.genderRate === -1) {
            genderRatioText = 'Asexual';
        } else {
            const femalePercent = (pokemon.genderRate / 8) * 100;
            const malePercent = 100 - femalePercent;
            genderRatioText = `♂ ${malePercent.toFixed(1)}% / ♀ ${femalePercent.toFixed(1)}%`;
        }
    }

    const bodyShapeMap = {
        'ball': 'Esfera',
        'squiggle': 'Ondulante',
        'fish': 'Pez',
        'quadruped': 'Cuadrúpedo',
        'wings': 'Alado',
        'tentacles': 'Tentáculos',
        'arms': 'Brazos',
        'humanoid': 'Humanoide',
        'bug-wings': 'Insecto alado',
        'other': 'Otro'
    };

    const eggGroupMap = {
        'monster': 'Monstruo',
        'water1': 'Agua 1',
        'bug': 'Bicho',
        'flying': 'Volador',
        'field': 'Campo',
        'fairy': 'Hada',
        'grass': 'Planta',
        'humanlike': 'Humanoide',
        'water3': 'Agua 3',
        'mineral': 'Mineral',
        'amorphous': 'Amorfo',
        'water2': 'Agua 2',
        'ditto': 'Ditto',
        'dragon': 'Dragón',
        'undiscovered': 'Indescubierto',
        'plant': 'Flora',
        'rock': 'Roca',
        'ground': 'Tierra',
        'dusk-mons': 'Nocturno',
        'swamp': 'Laguna',
        'unkown': '-',
        'no-eggs': 'Sin huevos',
        'marsh': 'Marjal',
        'flycatcher': 'Cazavoltadores',
        'aquatic': 'Acuático',
        'worm': 'Gusano',
        'plantae': 'Plantae',
        'invertebrate': 'Invertebrado',
        'arachnid': 'Aracnóide',
        'scorpion': 'Escorpiones',
        'sandstorm': 'Sandstorm',
        'deep-sea': 'Profundo',
        'flying-types': 'Volador',
        'unknown': '-',
        'legendary': 'Legendario',
        'indeterminate': '-'
    };

    let bodyShapeText = '-';
    if (pokemon.bodyShape) {
        bodyShapeText = bodyShapeMap[pokemon.bodyShape] || pokemon.bodyShape.charAt(0).toUpperCase() + pokemon.bodyShape.slice(1);
    }

    let eggGroupsText = '-';
    if (pokemon.eggGroups && pokemon.eggGroups.length > 0) {
        eggGroupsText = pokemon.eggGroups.map(eg => eggGroupMap[eg] || eg).join(', ');
    }

    let captureRateText = pokemon.captureRate !== null && pokemon.captureRate !== undefined ? pokemon.captureRate.toString() : '-';

    const elements = {
        'info-height': pokemon.height ? `${pokemon.height / 10} m` : '-',
        'info-weight': pokemon.weight ? `${pokemon.weight / 10} kg` : '-',
        'info-species': pokemon.species || 'No disponible',
        'info-abilities': pokemon.abilities ? pokemon.abilities.join(', ') : '-',
        'info-body-shape': bodyShapeText,
        'info-egg-groups': eggGroupsText,
        'info-gender-ratio': genderRatioText,
        'info-capture-rate': captureRateText,
        'info-description': pokemon.description || 'Descripción no disponible'
    };
    
    Object.entries(elements).forEach(([id, content]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = content;
    });
}

// ===== SISTEMA DE EVOLUCIONES MEJORADO =====

// Actualizar pestaña de evoluciones (versión mejorada con soporte para Eevee)
async function updateEvolutionTab(pokemon) {
    const evolutionContainer = document.getElementById('evolution-chain');
    if (!evolutionContainer) return;

    evolutionContainer.innerHTML = '<div class="loading">Cargando evoluciones...</div>';

    try {
        const speciesResponse = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokemon.id}/`);
        if (!speciesResponse.ok) throw new Error('No se pudo cargar la especie');

        const speciesData = await speciesResponse.json();

        // === CASO ESPECIAL: EEVEE ===
        if (pokemon.id === 133) {
            await loadEeveeEvolutions(pokemon, evolutionContainer);
            return;
        }

        // === CADENA EVOLUTIVA NORMAL PARA OTROS POKÉMON ===
        const evolutionResponse = await fetch(speciesData.evolution_chain.url);
        const evolutionData = await evolutionResponse.json();

        const evolutionChain = [];
        let current = evolutionData.chain;
        do {
            const evoName = current.species.name;
            const evoId = extractPokemonIdFromUrl(current.species.url);
            evolutionChain.push({ id: evoId, name: evoName });
            current = current.evolves_to[0];
        } while (current);

        // === FORMAS ESPECIALES ===
        const megaForms = [];
        const gmaxForms = [];
        const regionalForms = {
            alola: [],
            galar: [],
            hisui: [],
            paldea: []
        };

        if (speciesData.varieties && speciesData.varieties.length > 1) {
            for (const variety of speciesData.varieties) {
                const name = variety.pokemon.name.toLowerCase();
                const id = extractPokemonIdFromUrl(variety.pokemon.url);

                if (name.includes('mega')) megaForms.push({ id, name });
                else if (name.includes('gmax') || name.includes('gigantamax')) gmaxForms.push({ id, name });
                else if (name.includes('alola')) regionalForms.alola.push({ id, name });
                else if (name.includes('galar')) regionalForms.galar.push({ id, name });
                else if (name.includes('hisui')) regionalForms.hisui.push({ id, name });
                else if (name.includes('paldea')) regionalForms.paldea.push({ id, name });
            }
        }

        // === RENDERIZAR ===
        let html = `<div class="evolution-chain">`;

        // Cadena normal
        for (let i = 0; i < evolutionChain.length; i++) {
            const evo = evolutionChain[i];
            html += `
                <div class="evolution-stage" data-id="${evo.id}">
                    <img class="evolution-img" src="${getPokemonImage({ id: evo.id }, currentShinyMode, false, currentSpriteMode)}" alt="${evo.name}">
                    <div class="evolution-name">${capitalizeFirstLetter(evo.name)}</div>
                </div>
            `;
            if (i < evolutionChain.length - 1)
                html += `<span class="evolution-arrow">➡️</span>`;
        }
        html += `</div>`;

        // Mega
        if (megaForms.length > 0) {
            html += `<div class="mega-section"><h4>✨ Mega-Evoluciones</h4><div class="evolution-chain">`;
            for (const mega of megaForms) {
                html += `
                    <div class="evolution-stage" data-id="${mega.id}">
                        <img class="evolution-img" src="${getPokemonImage({ id: mega.id }, currentShinyMode, false, currentSpriteMode)}" alt="${mega.name}">
                        <div class="evolution-name">${capitalizeFirstLetter(mega.name)}</div>
                    </div>`;
            }
            html += `</div></div>`;
        }

        // Gigamax
        if (gmaxForms.length > 0) {
            html += `<div class="gmax-section"><h4>🌆 Formas Gigamax</h4><div class="evolution-chain">`;
            for (const gmax of gmaxForms) {
                html += `
                    <div class="evolution-stage" data-id="${gmax.id}">
                        <img class="evolution-img" src="${getPokemonImage({ id: gmax.id }, currentShinyMode, false, currentSpriteMode)}" alt="${gmax.name}">
                        <div class="evolution-name">${capitalizeFirstLetter(gmax.name)}</div>
                    </div>`;
            }
            html += `</div></div>`;
        }

        // === REGIONALES Y SUS EVOLUCIONES ===
        const regionNames = {
            alola: '🏝️ Formas de Alola',
            galar: '🇬🇧 Formas de Galar',
            hisui: '🏔️ Formas de Hisui',
            paldea: '🌄 Formas de Paldea'
        };

        for (const [region, forms] of Object.entries(regionalForms)) {
            if (forms.length === 0) continue;

            html += `<div class="regional-section"><h4>${regionNames[region]}</h4><div class="evolution-chain">`;

            for (const form of forms) {
                html += `
                    <div class="evolution-stage" data-id="${form.id}">
                        <img class="evolution-img" src="${getPokemonImage({ id: form.id }, currentShinyMode, false, currentSpriteMode)}" alt="${form.name}">
                        <div class="evolution-name">${capitalizeFirstLetter(form.name)}</div>
                    </div>
                `;

                // === BUSCAR EVOLUCIÓN REGIONAL (si existe) ===
                const regionalEvolution = await fetchRegionalEvolution(form.name);
                if (regionalEvolution) {
                    html += `<span class="evolution-arrow">➡️</span>
                    <div class="evolution-stage" data-id="${regionalEvolution.id}">
                        <img class="evolution-img" src="${getPokemonImage({ id: regionalEvolution.id }, currentShinyMode, false, currentSpriteMode)}" alt="${regionalEvolution.name}">
                        <div class="evolution-name">${capitalizeFirstLetter(regionalEvolution.name)}</div>
                    </div>`;
                }
            }

            html += `</div></div>`;
        }

        evolutionContainer.innerHTML = html;

        // === Eventos de clic ===
        evolutionContainer.querySelectorAll('.evolution-stage').forEach(stage => {
            stage.addEventListener('click', async () => {
                const id = stage.getAttribute('data-id');
                if (!id) return;
                playSound(selectSound);
                const index = allPokemonData.findIndex(p => p.id === parseInt(id));
                if (index !== -1) {
                    showPokemonDetails(index);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        });

    } catch (error) {
        console.error('Error al cargar evoluciones:', error);
        evolutionContainer.innerHTML = '<div class="error">No se pudieron cargar las evoluciones.</div>';
    }
}

function updateStatsDisplay(pokemon) {
    const statsList = document.getElementById('stats-list');
    
    if (!pokemon || !pokemon.stats) {
        statsList.innerHTML = '<p>Selecciona un Pokémon para ver sus estadísticas</p>';
        return;
    }
    
    console.log('🔧 Actualizando stats para:', pokemon.name, 'Stats:', pokemon.stats);
    
    let totalStats = 0;
    let statsHTML = '<div class="stats-grid">';
    
    // Orden de las estadísticas
    const statOrder = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
    
    statOrder.forEach(statName => {
        let statValue = 0;
        
        // Obtener el valor de forma segura
        if (pokemon.stats[statName] !== undefined) {
            // Si es un objeto simple {hp: 45, attack: 49, ...}
            statValue = pokemon.stats[statName];
        } else if (Array.isArray(pokemon.stats)) {
            // Si es un array (estructura original de PokeAPI)
            const statObj = pokemon.stats.find(s => {
                if (s.stat && s.stat.name === statName) return true;
                if (s.name === statName) return true;
                return false;
            });
            if (statObj) {
                statValue = statObj.base_stat || statObj.value || 0;
            }
        }
        
        totalStats += statValue;
        
        // Calcular porcentaje para la barra (máximo 255)
        const percentage = Math.min((statValue / 255) * 100, 100);
        const colorClass = getStatColorClass(statValue);
        const displayName = getStatName(statName);
        
        statsHTML += `
            <div class="stat-item stat-${statName}">
                <div class="stat-name">${displayName}</div>
                <div class="stat-value-container">
                    <div class="stat-number">${statValue}</div>
                    <div class="stat-bar-container">
                        <div class="stat-bar ${colorClass}" style="width: ${percentage}%"></div>
                    </div>
                </div>
            </div>
        `;
    });
    
    // Añadir el total
    statsHTML += `
        <div class="stats-total">
            <div class="stats-total-label">Total Base</div>
            <div class="stats-total-value">${totalStats}</div>
        </div>
    </div>`;
    
    statsList.innerHTML = statsHTML;
}

function getStatColorClass(value) {
    if (value <= 30) return 'very-low';
    if (value <= 60) return 'low';
    if (value <= 80) return 'below-average';
    if (value <= 100) return 'average';
    if (value <= 120) return 'good';
    if (value <= 150) return 'high';
    if (value <= 180) return 'very-high';
    if (value <= 210) return 'excellent';
    if (value <= 240) return 'outstanding';
    return 'perfect'; // 241-255
}

// Función auxiliar para obtener nombres de estadísticas en español
function getStatName(statName) {
    const statNames = {
        'hp': 'PS',
        'attack': 'Ataque',
        'defense': 'Defensa',
        'special-attack': 'Ataque Especial',
        'special-defense': 'Defensa Especial',
        'speed': 'Velocidad'
    };
    return statNames[statName] || statName;
}

// === FUNCIÓN ESPECIAL PARA EEVEE ===
async function loadEeveeEvolutions(pokemon, container) {
    try {
        // Lista de todas las evoluciones de Eevee con sus IDs
        const eeveeEvolutions = [
            { id: 134, name: 'vaporeon', type: 'water', method: 'Piedra Agua' },
            { id: 135, name: 'jolteon', type: 'electric', method: 'Piedra Trueno' },
            { id: 136, name: 'flareon', type: 'fire', method: 'Piedra Fuego' },
            { id: 196, name: 'espeon', type: 'psychic', method: 'Amistad + Día' },
            { id: 197, name: 'umbreon', type: 'dark', method: 'Amistad + Noche' },
            { id: 470, name: 'leafeon', type: 'grass', method: 'Piedra Musgo' },
            { id: 471, name: 'glaceon', type: 'ice', method: 'Piedra Hielo' },
            { id: 700, name: 'sylveon', type: 'fairy', method: 'Amistad + Movimiento de tipo Hada' }
        ];

        let html = `
            <div class="eevee-evolutions">
                <div class="evolution-header">
                    <h3>✨ Evoluciones de Eevee</h3>
                    <p>Eevee puede evolucionar en 8 Pokémon diferentes dependiendo de las condiciones</p>
                </div>
                <div class="eevee-base">
                    <div class="evolution-stage main-pokemon" data-id="133">
                        <img class="evolution-img" src="${getPokemonImage({ id: 133 }, currentShinyMode, false, currentSpriteMode)}" alt="eevee">
                        <div class="evolution-name">Eevee</div>
                    </div>
                </div>
                <div class="eevee-evolution-grid">
        `;

        // Mostrar todas las evoluciones en una cuadrícula
        for (const evolution of eeveeEvolutions) {
            html += `
                <div class="eevee-evolution-item" data-id="${evolution.id}">
                    <div class="evolution-stage" data-id="${evolution.id}">
                        <img class="evolution-img" src="${getPokemonImage({ id: evolution.id }, currentShinyMode, false, currentSpriteMode)}" alt="${evolution.name}">
                        <div class="evolution-name">${capitalizeFirstLetter(evolution.name)}</div>
                    </div>
                    <div class="evolution-info">
                        <span class="type-badge type-${evolution.type}">${typeTranslations[evolution.type]}</span>
                        <div class="evolution-method">${evolution.method}</div>
                    </div>
                </div>
            `;
        }

        html += `
                </div>
                <div class="evolution-note">
                    <p><strong>Nota:</strong> Eevee es conocido como el Pokémon evolutivo por su capacidad única de evolucionar en múltiples formas.</p>
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Eventos de clic para todas las evoluciones
        container.querySelectorAll('.evolution-stage').forEach(stage => {
            stage.addEventListener('click', async () => {
                const id = stage.getAttribute('data-id');
                if (!id) return;
                playSound(selectSound);
                const index = allPokemonData.findIndex(p => p.id === parseInt(id));
                if (index !== -1) {
                    showPokemonDetails(index);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        });

    } catch (error) {
        console.error('Error al cargar evoluciones de Eevee:', error);
        container.innerHTML = '<div class="error">No se pudieron cargar las evoluciones de Eevee.</div>';
    }
}

// === Buscar evolución exclusiva de una forma regional ===
async function fetchRegionalEvolution(formName) {
    try {
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${formName}/`);
        if (!res.ok) return null;

        const data = await res.json();
        const chainRes = await fetch(data.evolution_chain.url);
        const chainData = await chainRes.json();

        // Buscar si el primer nodo tiene una evolución distinta a la original
        let node = chainData.chain;
        if (node.evolves_to.length > 0) {
            const evoName = node.evolves_to[0].species.name;
            const evoId = extractPokemonIdFromUrl(node.evolves_to[0].species.url);
            if (!evoName.includes(formName.split('-')[0])) {
                return { id: evoId, name: evoName };
            }
        }
        return null;
    } catch {
        return null;
    }
}

// === Utilidades ===
function extractPokemonIdFromUrl(url) {
    const match = url.match(/\/pokemon-species\/(\d+)\//) || url.match(/\/pokemon\/(\d+)\//);
    return match ? parseInt(match[1]) : null;
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
// Actualizar pestaña de movimientos
async function updateMovesTab(pokemon) {
    const movesContainer = document.getElementById('moves-list');
    if (!movesContainer) return;
    
    if (!pokemon.moves || pokemon.moves.length === 0) {
        movesContainer.innerHTML = '<p>No se encontraron movimientos</p>';
        return;
    }
    
    movesContainer.innerHTML = '<div class="loading">Cargando movimientos...</div>';
    
    try {
        const movesToShow = pokemon.moves.slice(0, 50);
        const movesPromises = movesToShow.map(moveName => translateMove(moveName));
        const movesData = await Promise.all(movesPromises);
        
        const movesByType = {};
        movesData.forEach(move => {
            if (!movesByType[move.type]) movesByType[move.type] = [];
            movesByType[move.type].push(move);
        });
        
        let movesHTML = `
            <div class="moves-filters">
                <div class="moves-search">
                    <input type="text" id="moves-search-input" placeholder="Buscar movimiento...">
                </div>
                <div class="moves-type-filter">
                    <button class="type-filter-btn active" data-type="all">Todos</button>
        `;
        
        Object.keys(movesByType).forEach(type => {
            movesHTML += `<button class="type-filter-btn type-${type}" data-type="${type}">${typeTranslations[type] || type}</button>`;
        });
        
        movesHTML += `</div></div><div class="moves-grid">`;
        
        Object.entries(movesByType).forEach(([type, moves]) => {
            movesHTML += `
                <div class="move-category" data-type="${type}">
                    <h4>${typeTranslations[type] || type} (${moves.length})</h4>
                    <div class="moves-list">
            `;
            
            moves.forEach(move => {
                movesHTML += `
                    <div class="move-item type-${move.type}" data-name="${move.name.toLowerCase()}" data-type="${move.type}">
                        <div class="move-name">${move.name}</div>
                        <div class="move-details">
                            <span class="move-power">PW: ${move.power}</span>
                            <span class="move-accuracy">PP: ${move.pp}</span>
                        </div>
                    </div>
                `;
            });
            
            movesHTML += `</div></div>`;
        });
        
        movesHTML += `</div>`;
        movesContainer.innerHTML = movesHTML;
        setupMoveFilters();
    } catch (error) {
        movesContainer.innerHTML = '<p>Error al cargar los movimientos</p>';
    }
}

// Configurar filtros de movimientos
function setupMoveFilters() {
    const searchInput = document.getElementById('moves-search-input');
    const typeFilterBtns = document.querySelectorAll('.type-filter-btn');
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const moveItems = document.querySelectorAll('.move-item');
            const moveCategories = document.querySelectorAll('.move-category');
            
            moveItems.forEach(item => {
                const moveName = item.dataset.name;
                item.style.display = moveName.includes(searchTerm) ? 'flex' : 'none';
            });
            
            moveCategories.forEach(category => {
                const visibleMoves = category.querySelectorAll('.move-item[style*="display: flex"]');
                category.style.display = visibleMoves.length > 0 ? 'block' : 'none';
            });
        });
    }
    
    typeFilterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            typeFilterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const selectedType = btn.dataset.type;
            const moveItems = document.querySelectorAll('.move-item');
            const moveCategories = document.querySelectorAll('.move-category');
            
            if (selectedType === 'all') {
                moveItems.forEach(item => item.style.display = 'flex');
                moveCategories.forEach(category => category.style.display = 'block');
            } else {
                moveItems.forEach(item => {
                    const moveType = item.dataset.type;
                    item.style.display = moveType === selectedType ? 'flex' : 'none';
                });
                
                moveCategories.forEach(category => {
                    const categoryType = category.dataset.type;
                    const visibleMoves = category.querySelectorAll('.move-item[style*="display: flex"]');
                    category.style.display = (categoryType === selectedType && visibleMoves.length > 0) ? 'block' : 'none';
                });
            }
        });
    });
}

// Calcular efectividad de tipos
function calculateEffectivenessForPokemon(pokemon) {
    if (!pokemon || !pokemon.types) return null;
    
    const effectiveness = {};
    const types = Object.keys(typeTranslations);
    
    types.forEach(attackType => {
        let multiplier = 1;
        pokemon.types.forEach(defenseType => {
            multiplier *= typeEffectiveness[attackType][defenseType];
        });
        effectiveness[attackType] = multiplier;
    });
    
    return effectiveness;
}

// Actualizar pestaña de debilidades
function updateWeaknessesTab(pokemon) {
    const weaknessesContainer = document.getElementById('weaknesses-chart');
    if (!weaknessesContainer) return;
    
    const effectiveness = calculateEffectivenessForPokemon(pokemon);
    if (!effectiveness) {
        weaknessesContainer.innerHTML = '<p>No se pudieron calcular las debilidades</p>';
        return;
    }
    
    const weaknesses = { x4: [], x2: [], x1: [], x05: [], x025: [], x0: [] };
    
    Object.entries(effectiveness).forEach(([type, multiplier]) => {
        if (multiplier >= 4) weaknesses.x4.push(type);
        else if (multiplier >= 2) weaknesses.x2.push(type);
        else if (multiplier >= 1) weaknesses.x1.push(type);
        else if (multiplier >= 0.5) weaknesses.x05.push(type);
        else if (multiplier > 0) weaknesses.x025.push(type);
        else weaknesses.x0.push(type);
    });
    
    const sortTypes = (types) => types.sort((a, b) => {
        const nameA = typeTranslations[a] || a;
        const nameB = typeTranslations[b] || b;
        return nameA.localeCompare(nameB);
    });
    
    Object.keys(weaknesses).forEach(key => weaknesses[key] = sortTypes(weaknesses[key]));
    
    const createWeaknessSection = (types, title, color, icon, multiplier) => {
        if (types.length === 0) return '';
        
        return `
            <div class="weakness-section">
                <div class="weakness-title" style="color: ${color};">
                    <span class="weakness-icon">${icon}</span>
                    ${title} (${multiplier})
                </div>
                <div class="weakness-types-grid">
                    ${types.map(type => 
                        `<div class="weakness-type-item">
                            <span class="type-badge type-${type}">${typeTranslations[type] || type}</span>
                        </div>`
                    ).join('')}
                </div>
            </div>
        `;
    };
    
    let weaknessesHTML = `
        <div class="weakness-chart">
            <div class="weakness-header">
                <h3>Tabla de Efectividad</h3>
                <p>Basado en los tipos: ${pokemon.types.map(type => typeTranslations[type] || type).join(' y ')}</p>
            </div>
    `;
    
    weaknessesHTML += createWeaknessSection(weaknesses.x4, 'Muy Débil', '#ff4444', '💀', '4×');
    weaknessesHTML += createWeaknessSection(weaknesses.x2, 'Débil', '#ff6b6b', '⚠️', '2×');
    weaknessesHTML += createWeaknessSection(weaknesses.x1, 'Neutral', '#666666', '⚪', '1×');
    weaknessesHTML += createWeaknessSection(weaknesses.x05, 'Resistente', '#4CAF50', '🛡️', '0.5×');
    weaknessesHTML += createWeaknessSection(weaknesses.x025, 'Muy Resistente', '#2E7D32', '🛡️🛡️', '0.25×');
    weaknessesHTML += createWeaknessSection(weaknesses.x0, 'Inmune', '#9E9E9E', '🚫', '0×');
    
    weaknessesHTML += `
        <div class="weakness-info">
            <h4>💡 Cómo funciona la efectividad de tipos:</h4>
            <p>Cuando un Pokémon tiene dos tipos, los multiplicadores se combinan. Por ejemplo:</p>
            <ul>
                <li><strong>4×</strong>: Doble debilidad (2× × 2×)</li>
                <li><strong>2×</strong>: Debilidad normal</li>
                <li><strong>1×</strong>: Daño normal</li>
                <li><strong>0.5×</strong>: Resistencia</li>
                <li><strong>0.25×</strong>: Doble resistencia (0.5× × 0.5×)</li>
                <li><strong>0×</strong>: Inmune (el ataque no afecta)</li>
            </ul>
        </div>
    `;
    
    weaknessesContainer.innerHTML = weaknessesHTML;
    
    // Agregar event listeners a los tipos en la tabla de efectividad
    setTimeout(() => {
        const weaknessChart = weaknessesContainer.querySelector('.weakness-chart');
        if (!weaknessChart) return;
        
        const typeElements = weaknessChart.querySelectorAll('.type-badge');
        typeElements.forEach(typeElement => {
            typeElement.style.cursor = 'pointer';
            // Buscar clase type- pero que NO sea type-badge
            const typeClass = Array.from(typeElement.classList).find(cls => 
                cls.startsWith('type-') && cls !== 'type-badge'
            );
            if (typeClass) {
                const typeValue = typeClass.replace('type-', '');
                typeElement.dataset.type = typeValue;
                typeElement.addEventListener('click', (e) => {
                    e.stopPropagation();
                    console.log('Filtrando por tipo:', typeValue);
                    filterByTypeClick(typeValue);
                });
            }
        });
    }, 0);
}

// Añadir esta función utilitaria que falta
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function renderPokemonList(pokemonList) {
    const grid = document.getElementById('pokemon-grid');
    if (!grid) {
        console.error('No se encontró el elemento pokemon-grid');
        return;
    }
    
    grid.innerHTML = '';
    
    if (pokemonList.length === 0) {
        grid.innerHTML = '<div class="error">No se encontraron Pokémon con los filtros actuales</div>';
        return;
    }
    
    console.log(`Renderizando ${pokemonList.length} Pokémon`);
    pokemonList.forEach(pokemon => addPokemonToGrid(pokemon));
}

// ===== SISTEMA DE FAVORITOS =====
async function toggleFavorite(pokemonId) {
    playSound(clickSound);
    
    if (favorites.has(pokemonId)) {
        favorites.delete(pokemonId);
    } else {
        favorites.add(pokemonId);
    }
    
    // Guardar cambios
    if (currentUser) {
        await saveUserPokemonData();
    } else {
        saveToStorage();
    }
    
    // Actualizar botón en la vista de detalles
    const buttonElement = document.getElementById('favorite-btn');
    if (buttonElement) {
        const isFavorite = favorites.has(pokemonId);
        buttonElement.classList.toggle('active', isFavorite);
        const icon = buttonElement.querySelector('.button-icon');
        if (icon) icon.textContent = isFavorite ? '★' : '☆';
        buttonElement.innerHTML = `<span class="button-icon">${isFavorite ? '★' : '☆'}</span> ${isFavorite ? 'Quitar Favorito' : 'Añadir Favorito'}`;
    }
    
    // Actualizar tarjeta en la lista
    const pokemonCard = document.querySelector(`.pokemon-card[data-id="${pokemonId}"]`);
    if (pokemonCard) {
        pokemonCard.classList.toggle('favorite', favorites.has(pokemonId));
    }
    
    // Si el filtro de favoritos está activo, actualizar la lista
    const favoritesOnlyBtn = document.getElementById('favorites-only');
    if (favoritesOnlyBtn && favoritesOnlyBtn.classList.contains('active')) {
        filterFavorites();
    }
}

function toggleSpriteModeDetail(pokemon, index) {
    playSound(clickSound);
    
    currentSpriteMode = currentSpriteMode === '2d' ? '3d' : '2d';
    
    const newImageUrl = getPokemonImage(pokemon, currentShinyMode, currentFemaleMode, currentSpriteMode);
    const mainImg = document.getElementById('detail-main-img');
    if (mainImg) {
        mainImg.src = newImageUrl;
    }
    
    const buttonElement = document.getElementById('sprite-mode-toggle');
    if (buttonElement) {
        buttonElement.classList.toggle('sprite-2d-active');
        buttonElement.classList.toggle('sprite-3d-active');
        const display = buttonElement.querySelector('#sprite-mode-display');
        if (display) {
            display.textContent = currentSpriteMode === '2d' ? '📐 2D' : '🎨 3D';
        }
    }
    
    const view3dBtn = document.getElementById('view-3d-animated-btn');
    if (view3dBtn) {
        view3dBtn.style.display = currentSpriteMode === '3d' ? 'flex' : 'none';
    }
    
    updateGenderButtonFor3D();
    updateSpriteButton();
    updateAllPokemonImages();
    
    PokedexState.ui.spriteMode = currentSpriteMode;
    localStorage.setItem('pokedex-sprite-mode', currentSpriteMode);
}



function showPokemon3DAnimated(pokemon) {
    playSound(clickSound);
    
    const modal = document.getElementById('pokemon-3d-modal');
    const viewer = document.getElementById('pokemon-3d-viewer');
    
    if (modal && viewer) {
        const title = modal.querySelector('#pokemon-3d-title');
        if (title) {
            title.textContent = `${pokemon.name} - 3D Interactivo`;
        }
        
        const pokemonId = pokemon.id;
        const isShiny = PokedexState.ui.shinyMode;
        
        const modelUrl = isShiny 
            ? `https://raw.githubusercontent.com/Sudhanshu-Ambastha/Pokemon-3D-api/main/models/glb/shiny/${pokemonId}.glb`
            : `https://raw.githubusercontent.com/Sudhanshu-Ambastha/Pokemon-3D-api/main/models/glb/regular/${pokemonId}.glb`;
        
        viewer.src = modelUrl;
        modal.style.display = 'flex';
    }
}

async function saveUserPokemonData() {
    if (!currentUser) return;
    
    const favoritesArray = Array.from(favorites);
    const capturedArray = Array.from(captured);
    await userManager.savePokemonData(favoritesArray, capturedArray);
}

// ===== SISTEMA DE FILTROS =====
function filterByRegion(region) {
    currentRegion = region;
    
    if (region === 'all') {
        filteredPokemonData = [...allPokemonData];
    } else {
        filteredPokemonData = allPokemonData.filter(pokemon => pokemon.region === region);
    }
    
    const favoritesOnlyBtn = document.getElementById('favorites-only');
    if (favoritesOnlyBtn && favoritesOnlyBtn.classList.contains('active')) {
        filteredPokemonData = filteredPokemonData.filter(pokemon => favorites.has(pokemon.id));
    }
        
    renderPokemonList(filteredPokemonData);
    
    if (filteredPokemonData.length > 0) {
        const firstPokemonIndex = allPokemonData.findIndex(p => p.id === filteredPokemonData[0].id);
        if (firstPokemonIndex !== -1) showPokemonDetails(firstPokemonIndex);
    } else {
        clearPokemonDetails();
    }
}

function filterByTypeClick(type) {
    filteredPokemonData = allPokemonData.filter(pokemon => 
        pokemon.types.some(t => t === type)
    );
    
    const favoritesOnlyBtn = document.getElementById('favorites-only');
    if (favoritesOnlyBtn && favoritesOnlyBtn.classList.contains('active')) {
        filteredPokemonData = filteredPokemonData.filter(pokemon => favorites.has(pokemon.id));
    }
    
    document.getElementById('region-filter').value = 'all';
    document.getElementById('search-input').value = '';
    
    renderPokemonList(filteredPokemonData);
    
    if (filteredPokemonData.length > 0) {
        const firstPokemonIndex = allPokemonData.findIndex(p => p.id === filteredPokemonData[0].id);
        if (firstPokemonIndex !== -1) showPokemonDetails(firstPokemonIndex);
    } else {
        clearPokemonDetails();
    }
}

function clearPokemonDetails() {
    const detailContainer = document.getElementById('pokemon-detail');
    if (!detailContainer) return;
    
    detailContainer.innerHTML = `
        <div class="detail-header">
            <div class="placeholder-img">Imagen Pokémon</div>
            <div class="detail-title">
                <div class="detail-name">Selecciona un Pokémon</div>
                <div class="detail-id">#???</div>
            </div>
        </div>
        <p>No hay Pokémon que coincidan con los filtros aplicados</p>
    `;
    
    ['stats-list', 'info-height', 'info-weight', 'info-abilities', 'info-species', 'info-description', 'evolution-chain', 'moves-list', 'weaknesses-chart'].forEach(id => {
        const element = document.getElementById(id);
        if (element) element.innerHTML = '<p>Selecciona un Pokémon para ver la información</p>';
    });
}

function filterFavorites() {
    const favoritesOnlyBtn = document.getElementById('favorites-only');
    if (!favoritesOnlyBtn) return;
    
    playSound(clickSound);
    
    const isActive = favoritesOnlyBtn.classList.contains('active');
    
    if (isActive) {
        // Desactivar filtro de favoritos
        favoritesOnlyBtn.classList.remove('active');
        favoritesOnlyBtn.innerHTML = '<span class="button-icon">⭐</span>';
        filterByRegion(currentRegion);
    } else {
        // Activar filtro de favoritos
        favoritesOnlyBtn.classList.add('active');
        favoritesOnlyBtn.innerHTML = '<span class="button-icon">★</span>';
        
        // Filtrar Pokémon favoritos
        let filtered = allPokemonData;
        
        if (currentRegion !== 'all') {
            filtered = filtered.filter(pokemon => pokemon.region === currentRegion);
        }
        
        filteredPokemonData = filtered.filter(pokemon => favorites.has(pokemon.id));
        
        renderPokemonList(filteredPokemonData);
        
        if (filteredPokemonData.length > 0) {
            const firstPokemonIndex = allPokemonData.findIndex(p => p.id === filteredPokemonData[0].id);
            if (firstPokemonIndex !== -1) showPokemonDetails(firstPokemonIndex);
        } else {
            clearPokemonDetails();
        }
    }
}

// ===== SISTEMA DE EQUIPOS =====
function setupTeamSystem() {
    const teamBtn = document.getElementById('team-btn');
    const teamModal = document.getElementById('team-modal');
    
    if (!teamBtn || !teamModal) return;

    loadTeamsFromStorage();

    teamBtn.addEventListener('click', (e) => {
        playSound(clickSound);
        showTeamModal();
    });

    const closeButton = teamModal.querySelector('.close-button');
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            playSound(clickSound);
            teamModal.style.display = 'none';
        });
    }

    const saveTeamBtn = document.getElementById('save-team');
    const loadTeamBtn = document.getElementById('load-team');
    const clearTeamBtn = document.getElementById('clear-team');

    if (saveTeamBtn) saveTeamBtn.addEventListener('click', saveTeam);
    if (loadTeamBtn) loadTeamBtn.addEventListener('click', showLoadTeamModal);
    if (clearTeamBtn) clearTeamBtn.addEventListener('click', clearTeam);

    teamModal.addEventListener('click', (e) => {
        if (e.target === teamModal) {
            playSound(clickSound);
            teamModal.style.display = 'none';
        }
    });
}

function showTeamModal() {
    const teamModal = document.getElementById('team-modal');
    if (teamModal) {
        teamModal.style.display = 'flex';
        updateTeamDisplay();
    }
}

function updateTeamDisplay() {
    const teamSlots = document.querySelectorAll('.team-slot');
    
    teamSlots.forEach((slot, index) => {
        const slotEmpty = slot.querySelector('.slot-empty');
        const slotContent = slot.querySelector('.slot-content');
        const slotImg = slot.querySelector('.slot-img');
        const slotName = slot.querySelector('.slot-name');
        const removeBtn = slot.querySelector('.slot-remove');
        
        const pokemon = currentTeam[index];
        
        if (pokemon) {
            slotEmpty.style.display = 'none';
            slotContent.style.display = 'block';
            slotImg.src = getPokemonImage(pokemon, currentShinyMode, false, currentSpriteMode);
            slotImg.alt = pokemon.name;
            slotName.textContent = pokemon.name;
            slot.classList.add('filled');
            
            removeBtn.onclick = (e) => {
                e.stopPropagation();
                removeFromTeam(index);
            };
        } else {
            slotEmpty.style.display = 'flex';
            slotContent.style.display = 'none';
            slot.classList.remove('filled');
        }
    });
    
    updateTeamIndicators();
}

function updateTeamIndicators() {
    document.querySelectorAll('.pokemon-card').forEach(card => {
        const pokemonId = parseInt(card.dataset.id);
        const isInTeam = currentTeam.some(pokemon => pokemon && pokemon.id === pokemonId);
        card.classList.toggle('in-team', isInTeam);
    });
}

function addToTeam(pokemon) {
    playSound(selectSound);
    
    const emptySlotIndex = currentTeam.findIndex(slot => slot === null);
    if (emptySlotIndex === -1) {
        alert('¡Tu equipo está completo! Elimina un Pokémon para añadir otro.');
        return;
    }
    
    const alreadyInTeam = currentTeam.some(slot => slot && slot.id === pokemon.id);
    if (alreadyInTeam) {
        alert('¡Este Pokémon ya está en tu equipo!');
        return;
    }
    
    currentTeam[emptySlotIndex] = pokemon;
    updateTeamDisplay();
    updateTeamButtonState();
    showTeamNotification(`${pokemon.name} añadido al equipo!`);
    saveTeamToStorage();
}

function removeFromTeam(slotIndex) {
    playSound(clickSound);
    const pokemon = currentTeam[slotIndex];
    currentTeam[slotIndex] = null;
    updateTeamDisplay();
    if (pokemon) showTeamNotification(`${pokemon.name} eliminado del equipo`);
    saveTeamToStorage();
}

function saveTeam() {
    playSound(clickSound);
    
    const teamCount = currentTeam.filter(pokemon => pokemon !== null).length;
    if (teamCount === 0) {
        alert('¡Tu equipo está vacío! Añade al menos un Pokémon para guardarlo.');
        return;
    }
    
    const teamName = prompt('Nombre para tu equipo:', `Mi Equipo ${savedTeams.length + 1}`);
    if (teamName && teamName.trim() !== '') {
        const teamData = {
            name: teamName.trim(),
            pokemon: currentTeam.map(slot => slot ? slot.id : null),
            timestamp: new Date().toLocaleString()
        };
        
        const existingIndex = savedTeams.findIndex(team => team.name === teamData.name);
        if (existingIndex !== -1) {
            if (!confirm(`Ya existe un equipo llamado "${teamData.name}". ¿Quieres reemplazarlo?`)) return;
            savedTeams[existingIndex] = teamData;
        } else {
            savedTeams.push(teamData);
        }
        
        saveTeamsToStorage();
        showTeamNotification(`Equipo "${teamData.name}" guardado!`);
    }
}

function showLoadTeamModal() {
    playSound(clickSound);
    
    if (savedTeams.length === 0) {
        alert('No tienes equipos guardados.');
        return;
    }
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.7); display: flex; justify-content: center;
        align-items: center; z-index: 10001;
    `;
    
    modal.innerHTML = `
        <div style="background: var(--modal-bg); padding: 20px; border-radius: 15px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;">
            <h3 style="color: var(--text-color); margin-bottom: 15px; text-align: center;">Cargar Equipo</h3>
            <div class="teams-list">
                ${savedTeams.map((team, index) => `
                    <div class="team-item">
                        <div class="team-item-info">
                            <div class="team-item-name">${team.name}</div>
                            <div class="team-item-pokemon">
                                ${team.pokemon.filter(id => id !== null).map(id => {
                                    const pokemon = allPokemonData.find(p => p.id === id);
                                    return pokemon ? `<span>${pokemon.name}</span>` : '';
                                }).join('')}
                            </div>
                            <div style="font-size: 10px; color: var(--pokedex-gray);">Creado: ${team.timestamp}</div>
                        </div>
                        <div class="team-item-actions">
                            <button class="pokedex-button small" onclick="loadTeam(${index})">Cargar</button>
                            <button class="pokedex-button small secondary" onclick="deleteTeam(${index})">Eliminar</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div style="text-align: center; margin-top: 15px;">
                <button class="pokedex-button secondary" onclick="this.parentElement.parentElement.remove()">Cancelar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

function loadTeam(teamIndex) {
    playSound(selectSound);
    const team = savedTeams[teamIndex];
    if (!team) return;
    
    currentTeam = team.pokemon.map(id => id === null ? null : allPokemonData.find(pokemon => pokemon.id === id) || null);
    updateTeamDisplay();
    
    document.getElementById('team-modal').style.display = 'none';
    document.querySelector('div[style*="z-index: 10001"]')?.remove();
    showTeamNotification(`Equipo "${team.name}" cargado!`);
}

function deleteTeam(teamIndex) {
    playSound(clickSound);
    if (confirm('¿Estás seguro de que quieres eliminar este equipo?')) {
        savedTeams.splice(teamIndex, 1);
        saveTeamsToStorage();
        document.querySelector('div[style*="z-index: 10001"]')?.remove();
        showLoadTeamModal();
        showTeamNotification('Equipo eliminado');
    }
}

function clearTeam() {
    playSound(clickSound);
    if (confirm('¿Estás seguro de que quieres limpiar tu equipo actual?')) {
        currentTeam = Array(6).fill(null);
        updateTeamDisplay();
        saveTeamToStorage();
        showTeamNotification('Equipo limpiado');
    }
}

function showTeamNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
        background: var(--pokedex-green); color: white; padding: 10px 20px;
        border-radius: 20px; z-index: 10002; font-weight: bold;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

function saveTeamToStorage() {
    const teamData = { currentTeam: currentTeam.map(slot => slot ? slot.id : null), timestamp: Date.now() };
    try { localStorage.setItem('pokedex-current-team', JSON.stringify(teamData)); } catch (error) {}
}

function loadTeamFromStorage() {
    try {
        const teamData = localStorage.getItem('pokedex-current-team');
        if (teamData) currentTeam = JSON.parse(teamData).currentTeam.map(id => id);
    } catch (error) { currentTeam = Array(6).fill(null); }
}

function saveTeamsToStorage() {
    try { localStorage.setItem('pokedex-saved-teams', JSON.stringify(savedTeams)); } catch (error) {}
}

function loadTeamsFromStorage() {
    try {
        const teamsData = localStorage.getItem('pokedex-saved-teams');
        if (teamsData) savedTeams = JSON.parse(teamsData);
    } catch (error) { savedTeams = []; }
}

function updateTeamButtonState() {
    const teamButton = document.getElementById('team-add-btn');
    if (teamButton && allPokemonData[currentPokemonIndex]) {
        const currentPokemon = allPokemonData[currentPokemonIndex];
        const isInTeam = currentTeam.some(slot => slot && slot.id === currentPokemon.id);
        const isTeamFull = currentTeam.every(slot => slot !== null);
        
        teamButton.disabled = isInTeam || isTeamFull;
        
        if (isInTeam) {
            teamButton.innerHTML = '<span class="button-icon">✅</span> En equipo';
            teamButton.classList.add('active');
        } else if (isTeamFull) {
            teamButton.innerHTML = '<span class="button-icon">❌</span> Equipo lleno';
            teamButton.classList.remove('active');
        } else {
            teamButton.innerHTML = '<span class="button-icon">⚔️</span> Añadir al equipo';
            teamButton.classList.remove('active');
        }
    }
}

// ===== SISTEMA DE COMPARACIÓN =====
function addToComparison(pokemon) {
    playSound(selectSound);
    
    // Verificar si ya está en la comparación
    const existingIndex = comparisonGroup.findIndex(p => p && p.id === pokemon.id);
    if (existingIndex !== -1) {
        // Si ya está, quitarlo
        comparisonGroup[existingIndex] = null;
        updateCompareButton();
        saveComparisonToStorage();
        showTeamNotification(`${pokemon.name} eliminado de la comparación`);
        return;
    }
    
    // Buscar slot vacío
    const emptySlotIndex = comparisonGroup.findIndex(slot => slot === null);
    
    if (emptySlotIndex === -1) {
        // No hay slots vacíos, preguntar si reemplazar el último
        if (confirm('¡Ya tienes 6 Pokémon en la comparación! ¿Quieres reemplazar el último?')) {
            comparisonGroup[5] = pokemon;
        } else {
            return;
        }
    } else {
        comparisonGroup[emptySlotIndex] = pokemon;
    }
    
    updateCompareButton();
    saveComparisonToStorage();
    
    // Mostrar modal si hay al menos 2 Pokémon
    const pokemonCount = comparisonGroup.filter(p => p !== null).length;
    if (pokemonCount >= 2) {
        showCompareModal();
    } else {
        showTeamNotification(`${pokemon.name} añadido a la comparación (${pokemonCount}/6)`);
    }
}

function updateCompareButton() {
    const compareBtn = document.getElementById('compare-btn');
    if (compareBtn) {
        compareBtn.classList.remove('active');
        compareBtn.innerHTML = `<span class="button-icon">⚖️</span> Comparar`;
    }
}

function updateComparePokemonInfo(pokemon, number) {
    document.getElementById(`compare-img-${number}`).src = getPokemonImage(pokemon, currentShinyMode, false, currentSpriteMode);
    document.getElementById(`compare-name-${number}`).textContent = pokemon.name;
    document.getElementById(`compare-id-${number}`).textContent = `#${pokemon.id.toString().padStart(3, '0')}`;
    
    const typesElement = document.getElementById(`compare-types-${number}`);
    typesElement.innerHTML = '';
    pokemon.types.forEach(type => {
        const typeBadge = document.createElement('span');
        typeBadge.className = `type-badge type-${type}`;
        typeBadge.textContent = typeTranslations[type] || type;
        typesElement.appendChild(typeBadge);
    });
    
    const statsElement = document.getElementById(`compare-stats-${number}`);
    statsElement.innerHTML = '';
    Object.entries(pokemon.stats).forEach(([stat, value]) => {
        const statRow = document.createElement('div');
        statRow.className = 'compare-stat';
        statRow.innerHTML = `<span>${statNames[stat] || stat}</span><span>${value}</span>`;
        statsElement.appendChild(statRow);
    });
}

// ===== SISTEMA DE HISTORIAL =====
function addToHistory(pokemonIndex) {
    const pokemon = allPokemonData[pokemonIndex];
    if (!pokemon) return;
    
    if (navigationHistory.length > 0 && navigationHistory[navigationHistory.length - 1].id === pokemon.id) return;
    
    if (navigationHistory.length >= 50) navigationHistory.shift();
    
    navigationHistory.push({ id: pokemon.id, name: pokemon.name, index: pokemonIndex, timestamp: Date.now() });
    saveToStorage();
}

function showHistoryModal() {
    const historyModal = document.getElementById('history-modal');
    if (!historyModal) return;
    
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '';
    
    if (navigationHistory.length === 0) {
        historyList.innerHTML = '<p style="text-align: center; color: var(--pokedex-gray);">No hay historial de navegación</p>';
    } else {
        [...navigationHistory].reverse().forEach((item, index) => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            
            const pokemon = allPokemonData.find(p => p.id === item.id);
            const imageUrl = pokemon ? getPokemonImage(pokemon, currentShinyMode, false, currentSpriteMode) : '';
            
            historyItem.innerHTML = `
                <img class="history-img" src="${imageUrl}" alt="${item.name}">
                <div class="history-info">
                    <div class="history-name">${item.name}</div>
                    <div class="history-id">#${item.id.toString().padStart(3, '0')}</div>
                </div>
            `;
            
            historyItem.addEventListener('click', () => {
                playSound(selectSound);
                showPokemonDetails(item.index);
                historyModal.style.display = 'none';
            });
            
            historyList.appendChild(historyItem);
        });
    }
    
    historyModal.style.display = 'flex';
}

function clearHistory() {
    navigationHistory = [];
    saveToStorage();
    document.getElementById('history-modal').style.display = 'none';
    showTeamNotification('Historial limpiado');
}

// ===== CONFIGURACIÓN DE LA INTERFAZ =====

function performSearch() {
    const searchInput = document.getElementById('search-input');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
    if (currentRegion === 'all') {
        filteredPokemonData = [...allPokemonData];
    } else {
        filteredPokemonData = allPokemonData.filter(pokemon => pokemon.region === currentRegion);
    }
    
    if (searchTerm !== '') {
        filteredPokemonData = filteredPokemonData.filter(pokemon => 
            pokemon.name.toLowerCase().includes(searchTerm) || 
            pokemon.id.toString().includes(searchTerm) ||
            pokemon.types.some(type => 
                type.toLowerCase().includes(searchTerm) ||
                (typeTranslations[type] && typeTranslations[type].toLowerCase().includes(searchTerm))
            )
        );
    }
    
    const favoritesOnlyBtn = document.getElementById('favorites-only');
    if (favoritesOnlyBtn && favoritesOnlyBtn.classList.contains('active')) {
        filteredPokemonData = filteredPokemonData.filter(pokemon => favorites.has(pokemon.id));
    }
                
    renderPokemonList(filteredPokemonData);
    
    if (filteredPokemonData.length > 0) {
        const firstPokemonIndex = allPokemonData.findIndex(p => p.id === filteredPokemonData[0].id);
        if (firstPokemonIndex !== -1) showPokemonDetails(firstPokemonIndex);
    } else {
        clearPokemonDetails();
    }
}

// Configurar búsqueda
function setupSearch() {
    const searchInput = document.getElementById('search-input');
    const regionFilter = document.getElementById('region-filter');
    
    if (regionFilter) {
        regionFilter.addEventListener('change', (e) => {
            playSound(clickSound);
            filterByRegion(e.target.value);
        });
    }
    
    if (searchInput) {
        const debouncedSearch = debounce(performSearch, 300);
        searchInput.addEventListener('input', debouncedSearch);
    }
}

// Configurar navegación
function setupNavigation() {
    const prevButton = document.getElementById('prev-button');
    const nextButton = document.getElementById('next-button');
    
    if (prevButton) {
        prevButton.addEventListener('click', () => {
            playSound(clickSound);
            if (currentPokemonIndex > 0) showPokemonDetails(currentPokemonIndex - 1);
        });
    }
    
    if (nextButton) {
        nextButton.addEventListener('click', () => {
            playSound(clickSound);
            if (currentPokemonIndex < allPokemonData.length - 1) showPokemonDetails(currentPokemonIndex + 1);
        });
    }
}

function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            playSound(clickSound);
            
            tabButtons.forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
            
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            const tabPane = document.getElementById(`${tabId}-tab`);
            if (tabPane) tabPane.classList.add('active');

            // Actualizar la tabla de tipos si es la pestaña activa
            if (tabId === 'type-chart') {
                updateTypeChartTab();
            }
        });
    });
}
// Configurar tema
function setupThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            playSound(clickSound);
            document.body.classList.toggle('light-theme');
            document.body.classList.toggle('dark-theme');
            updateThemeButton();
            saveToStorage();
        });
    }
}

function updateThemeButton() {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.textContent = document.body.classList.contains('dark-theme') ? '☀️ Modo Claro' : '🌙 Modo Oscuro';
    }
}

// Configurar sonido
function setupSoundToggle() {
    const soundToggle = document.getElementById('sound-toggle');
    
    if (soundToggle) {
        soundToggle.addEventListener('click', () => {
            playSound(clickSound);
            soundEnabled = !soundEnabled;
            updateSoundButton();
            saveToStorage();
        });
    }
}

function updateSoundButton() {
    const soundToggle = document.getElementById('sound-toggle');
    const volumeSliderWrapper = document.querySelector('.sound-volume-slider-wrapper');
    
    if (soundToggle) {
        soundToggle.textContent = soundEnabled ? '🔊 Sonido Activado' : ' 🔇 Sonido Desactivado';
    }
    
    if (volumeSliderWrapper) {
        volumeSliderWrapper.style.display = soundEnabled ? '' : 'none';
    }
}

function initializeVolumeControl() {
    const volumeSlider = document.getElementById('volume-slider');
    const volumePercent = document.getElementById('volume-percent');
    
    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            const value = e.target.value;
            globalVolume = value / 100;
            volumeGainNode.gain.value = globalVolume;
            
            if (pokemonCry) {
                pokemonCry.volume = globalVolume;
            }
            
            if (volumePercent) {
                volumePercent.textContent = value + '%';
            }
            
            playSound(clickSound);
        });
        
        volumeSlider.addEventListener('change', saveToStorage);
        
        volumeSlider.value = Math.round(globalVolume * 100);
        if (volumePercent) {
            volumePercent.textContent = Math.round(globalVolume * 100) + '%';
        }
    }
    
    updateSoundButton();
}

// Configurar shiny toggle
function updateShinyButton() {
    const shinyToggle = document.getElementById('shiny-toggle');
    if (shinyToggle) {
        shinyToggle.textContent = currentShinyMode ? '⭐ Normal' : '✨ Shiny';
        shinyToggle.classList.toggle('active', currentShinyMode);
    }
}

function toggleShinyMode() {
    playSound(clickSound);
    currentShinyMode = !currentShinyMode;
    updateShinyButton();
    saveToStorage();
    updateAllPokemonImages();
    
    if (allPokemonData.length > 0 && currentPokemonIndex >= 0) {
        showPokemonDetails(currentPokemonIndex);
    }
}

function updateAllPokemonImages() {
    document.querySelectorAll('.pokemon-card').forEach(card => {
        const pokemonId = parseInt(card.dataset.id);
        const pokemon = allPokemonData.find(p => p.id === pokemonId);
        if (pokemon) {
            const img = card.querySelector('.pokemon-img');
            if (img) img.src = getPokemonImage(pokemon, currentShinyMode, false, currentSpriteMode);
        }
    });
    
    const detailImg = document.querySelector('.detail-img');
    if (detailImg && allPokemonData[currentPokemonIndex]) {
        detailImg.src = getPokemonImage(allPokemonData[currentPokemonIndex], currentShinyMode, currentFemaleMode, currentSpriteMode);
    }
    
    updateTeamDisplay();
}

function setupShinyToggle() {
    const shinyToggle = document.getElementById('shiny-toggle');
    if (shinyToggle) shinyToggle.addEventListener('click', toggleShinyMode);
}

function updateSpriteButton() {
    const spriteToggle = document.getElementById('sprite-toggle');
    if (spriteToggle) {
        spriteToggle.textContent = currentSpriteMode === '3d' ? '🎬 3D' : '📐 2D';
        spriteToggle.className = 'pokedex-button small';
    }
}

function toggleSpriteMode() {
    playSound(clickSound);
    currentSpriteMode = currentSpriteMode === '2d' ? '3d' : '2d';
    updateSpriteButton();
    updateAllPokemonImages();
    
    const view3dBtn = document.getElementById('view-3d-animated-btn');
    if (view3dBtn) {
        view3dBtn.style.display = currentSpriteMode === '3d' ? 'flex' : 'none';
    }
    
    updateGenderButtonFor3D();
    
    localStorage.setItem('pokedex-sprite-mode', currentSpriteMode);
}

function setupSpriteToggle() {
    const spriteToggle = document.getElementById('sprite-toggle');
    if (spriteToggle) {
        spriteToggle.addEventListener('click', toggleSpriteMode);
        const savedSpriteMode = localStorage.getItem('pokedex-sprite-mode');
        if (savedSpriteMode) {
            currentSpriteMode = savedSpriteMode;
            updateSpriteButton();
        }
    }
}

// Configurar filtros por tipo
function setupTypeFilters() {
    const typeFiltersContainer = document.getElementById('type-filters');
    if (!typeFiltersContainer) return;

    typeFiltersContainer.innerHTML = '';

    Object.entries(typeTranslations).forEach(([typeKey, typeName]) => {
        const typeButton = document.createElement('button');
        typeButton.className = `type-filter type-badge type-${typeKey}`;
        typeButton.textContent = typeName;
        typeButton.dataset.type = typeKey;

        typeButton.addEventListener('click', () => {
            playSound(clickSound);
            typeButton.classList.toggle('active');
            filterByType();
        });

        typeFiltersContainer.appendChild(typeButton);
    });

    // Añadir selector de relación de tipos
    const relationshipSelector = document.createElement('select');
    relationshipSelector.id = 'type-relationship';
    relationshipSelector.innerHTML = `
        <option value="any">Cualquier tipo seleccionado</option>
        <option value="all">Todos los tipos seleccionados</option>
    `;
    relationshipSelector.addEventListener('change', filterByType);
    
    const relationshipContainer = document.createElement('div');
    relationshipContainer.style.marginTop = '10px';
    relationshipContainer.innerHTML = '<label>Relación entre tipos:</label>';
    relationshipContainer.appendChild(relationshipSelector);
    
    typeFiltersContainer.parentElement.appendChild(relationshipContainer);
}

function filterByType() {
    const activeTypeFilters = document.querySelectorAll('#type-filters .type-filter.active');
    const selectedTypes = Array.from(activeTypeFilters).map(button => button.dataset.type);
    const relationship = document.getElementById('type-relationship').value;

    if (selectedTypes.length === 0) {
        filterByRegion(currentRegion);
        return;
    }

    let filtered = allPokemonData;
    if (currentRegion !== 'all') {
        filtered = filtered.filter(pokemon => pokemon.region === currentRegion);
    }

    if (relationship === 'any') {
        filtered = filtered.filter(pokemon => 
            pokemon.types.some(type => selectedTypes.includes(type))
        );
    } else if (relationship === 'all') {
        filtered = filtered.filter(pokemon => 
            selectedTypes.every(type => pokemon.types.includes(type))
        );
    }

    const favoritesOnlyBtn = document.getElementById('favorites-only');
    if (favoritesOnlyBtn && favoritesOnlyBtn.classList.contains('active')) {
        filtered = filtered.filter(pokemon => favorites.has(pokemon.id));
    }

    filteredPokemonData = filtered;
    renderPokemonList(filteredPokemonData);

    if (filteredPokemonData.length > 0) {
        const firstPokemonIndex = allPokemonData.findIndex(p => p.id === filteredPokemonData[0].id);
        if (firstPokemonIndex !== -1) showPokemonDetails(firstPokemonIndex);
    } else {
        clearPokemonDetails();
    }
}

// Configurar filtros por stats
function setupStatFilters() {
    const applyStatFilterBtn = document.getElementById('apply-stat-filter');
    if (!applyStatFilterBtn) return;

    applyStatFilterBtn.addEventListener('click', applyStatFilter);
}

function applyStatFilter() {
    const statFilter = document.getElementById('stat-filter').value;
    const statComparison = document.getElementById('stat-comparison').value;
    const statValue = parseInt(document.getElementById('stat-value').value);

    if (!statFilter || isNaN(statValue)) {
        alert('Por favor, selecciona un stat y introduce un valor numérico.');
        return;
    }

    let filtered = allPokemonData;
    if (currentRegion !== 'all') {
        filtered = filtered.filter(pokemon => pokemon.region === currentRegion);
    }

    filtered = filtered.filter(pokemon => {
        const value = pokemon.stats[statFilter];
        if (statComparison === 'greater') {
            return value >= statValue;
        } else {
            return value <= statValue;
        }
    });

    const favoritesOnlyBtn = document.getElementById('favorites-only');
    if (favoritesOnlyBtn && favoritesOnlyBtn.classList.contains('active')) {
        filtered = filtered.filter(pokemon => favorites.has(pokemon.id));
    }

    filteredPokemonData = filtered;
    renderPokemonList(filteredPokemonData);

    if (filteredPokemonData.length > 0) {
        const firstPokemonIndex = allPokemonData.findIndex(p => p.id === filteredPokemonData[0].id);
        if (firstPokemonIndex !== -1) showPokemonDetails(firstPokemonIndex);
    } else {
        clearPokemonDetails();
    }
}

// Configurar logo del header
function setupHeaderLogo() {
    const headerLogo = document.getElementById('header-logo');
    if (headerLogo) {
        headerLogo.addEventListener('click', () => {
            playSound(clickSound);
            
            const regionFilter = document.getElementById('region-filter');
            if (regionFilter) regionFilter.value = 'all';
            
            const searchInput = document.getElementById('search-input');
            if (searchInput) searchInput.value = '';
            
            document.querySelectorAll('#type-filters .type-filter.active').forEach(button => {
                button.classList.remove('active');
            });
            
            const favoritesOnlyBtn = document.getElementById('favorites-only');
            if (favoritesOnlyBtn && favoritesOnlyBtn.classList.contains('active')) {
                favoritesOnlyBtn.classList.remove('active');
            }
            
            renderPokemonList(allPokemonData);
            
            if (allPokemonData.length > 0) {
                showPokemonDetails(0);
            }
            
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        
        headerLogo.style.transition = 'transform 0.2s ease';
        headerLogo.style.cursor = 'pointer';
        headerLogo.addEventListener('mouseenter', () => {
            headerLogo.style.transform = 'scale(1.05)';
        });
        headerLogo.addEventListener('mouseleave', () => {
            headerLogo.style.transform = 'scale(1)';
        });
    }
}

// ===== SISTEMA DE COMPARACIÓN MÚLTIPLE =====

// Variables globales para comparación múltiple
let comparisonGroup = Array(6).fill(null);
let savedComparisonGroups = [];

// Inicializar sistema de comparación múltiple
function setupMultipleComparison() {
    // Reemplazar la función addToComparison existente
    window.addToComparison = function(pokemon) {
        playSound(selectSound);
        
        const emptySlotIndex = comparisonGroup.findIndex(slot => slot === null);
        if (emptySlotIndex === -1) {
            // Si no hay slots vacíos, preguntar si reemplazar
            if (confirm('¡Ya tienes 6 Pokémon en la comparación! ¿Quieres reemplazar el último?')) {
                comparisonGroup[5] = pokemon;
            } else {
                return;
            }
        } else {
            comparisonGroup[emptySlotIndex] = pokemon;
        }
        
        updateCompareButton();
        saveComparisonToStorage();
        
        // Mostrar modal si hay al menos 2 Pokémon
        if (comparisonGroup.filter(p => p !== null).length >= 2) {
            showCompareModal();
        }
    };

    // Cargar grupos guardados
    loadComparisonGroups();
    
    // Configurar slots de comparación
    setupComparisonSlots();
    
    // Configurar tabs de comparación
    setupComparisonTabs();
    
    // Configurar acciones rápidas
    setupQuickActions();
}

// Configurar slots de comparación
function setupComparisonSlots() {
    const slots = document.querySelectorAll('.compare-slot');
    
    slots.forEach((slot, index) => {
        slot.addEventListener('click', () => {
            // Siempre abrir selector, tanto si está vacío como si tiene Pokémon
            openPokemonSelectorForSlot(index);
        });
        
        // Actualizar visualización del slot
        updateComparisonSlot(slot, index);
    });
}

// Actualizar slot individual
function updateComparisonSlot(slot, index) {
    const slotEmpty = slot.querySelector('.slot-empty');
    const slotContent = slot.querySelector('.slot-content');
    const slotImg = slot.querySelector('.slot-img');
    const slotName = slot.querySelector('.slot-name');
    const removeBtn = slot.querySelector('.slot-remove');
    
    const pokemon = comparisonGroup[index];
    
    if (pokemon) {
        slotEmpty.style.display = 'none';
        slotContent.style.display = 'block';
        slotImg.src = getPokemonImage(pokemon, currentShinyMode);
        slotImg.alt = pokemon.name;
        slotName.textContent = pokemon.name;
        slot.classList.add('filled');
        
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            removeFromComparison(index);
        };
    } else {
        slotEmpty.style.display = 'flex';
        slotContent.style.display = 'none';
        slot.classList.remove('filled');
    }
}

// Abrir selector de Pokémon para slot
function openPokemonSelectorForSlot(slotIndex) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.8); display: flex; justify-content: center;
        align-items: center; z-index: 10003;
    `;
    
    modal.innerHTML = `
        <div style="background: var(--modal-bg); padding: 20px; border-radius: 15px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;">
            <h3 style="color: var(--text-color); margin-bottom: 15px; text-align: center;">Seleccionar Pokémon</h3>
            <div style="margin-bottom: 15px;">
                <input type="text" id="comparison-search" placeholder="Buscar Pokémon..." style="width: 100%; padding: 10px; border-radius: 8px; border: 2px solid var(--pokedex-blue); background: var(--input-bg); color: var(--input-text);">
            </div>
            <div class="pokemon-grid" style="max-height: 400px; overflow-y: auto; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));">
                ${allPokemonData.map(pokemon => `
                    <div class="pokemon-card" data-id="${pokemon.id}" style="cursor: pointer;">
                        <img src="${getPokemonImage(pokemon, currentShinyMode)}" alt="${pokemon.name}" style="width: 60px; height: 60px; object-fit: contain;">
                        <div style="font-size: 11px; margin-top: 5px;">${pokemon.name}</div>
                    </div>
                `).join('')}
            </div>
            <div style="text-align: center; margin-top: 15px;">
                <button class="pokedex-button secondary" onclick="this.parentElement.parentElement.remove()">Cancelar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Búsqueda en tiempo real
    const searchInput = modal.querySelector('#comparison-search');
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const cards = modal.querySelectorAll('.pokemon-card');
        
        cards.forEach(card => {
            const pokemonName = card.querySelector('div').textContent.toLowerCase();
            card.style.display = pokemonName.includes(searchTerm) ? 'block' : 'none';
        });
    });
    
    // Selección de Pokémon
    modal.querySelectorAll('.pokemon-card').forEach(card => {
        card.addEventListener('click', () => {
            const pokemonId = parseInt(card.dataset.id);
            const pokemon = allPokemonData.find(p => p.id === pokemonId);
            
            if (pokemon) {
                comparisonGroup[slotIndex] = pokemon;
                updateComparisonSlots();
                updateComparisonViews();
                modal.remove();
                playSound(selectSound);
            }
        });
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// Remover Pokémon de comparación
function removeFromComparison(index) {
    playSound(clickSound);
    comparisonGroup[index] = null;
    updateComparisonSlots();
    updateComparisonViews();
    saveComparisonToStorage();
}

// Actualizar todos los slots
function updateComparisonSlots() {
    const slots = document.querySelectorAll('.compare-slot');
    slots.forEach((slot, index) => {
        updateComparisonSlot(slot, index);
    });
}

// Configurar tabs de comparación
function setupComparisonTabs() {
    document.querySelectorAll('.compare-tab-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const tab = e.target.dataset.tab;
            
            // Activar tab
            document.querySelectorAll('.compare-tab-button').forEach(btn => {
                btn.classList.remove('active');
            });
            e.target.classList.add('active');
            
            // Mostrar contenido del tab
            document.querySelectorAll('.compare-tab-pane').forEach(pane => {
                pane.classList.remove('active');
            });
            document.getElementById(`compare-${tab}`).classList.add('active');
            
            // Actualizar vista específica
            updateComparisonView(tab);
        });
    });
}

// Actualizar vista de comparación específica
function updateComparisonView(view) {
    switch (view) {
        case 'table':
            updateComparisonTable();
            break;
        case 'radar':
            updateRadarChart();
            break;
        case 'types':
            updateTypeAnalysis();
            break;
        case 'sidebyside':
            updateSideBySideView();
            break;
    }
}

// Actualizar todas las vistas
function updateComparisonViews() {
    const activeTab = document.querySelector('.compare-tab-button.active');
    if (activeTab) {
        updateComparisonView(activeTab.dataset.tab);
    }
}

// Actualizar tabla comparativa
function updateComparisonTable() {
    const table = document.querySelector('.comparison-table');
    const summary = document.getElementById('comparison-stats-summary');
    
    if (!table) return;
    
    const pokemons = comparisonGroup.filter(p => p !== null);
    
    if (pokemons.length < 2) {
        table.innerHTML = '<tr><td colspan="' + (pokemons.length + 1) + '" style="text-align: center; padding: 40px; color: var(--pokedex-gray);">Selecciona al menos 2 Pokémon para comparar</td></tr>';
        summary.innerHTML = '';
        return;
    }
    
    // Crear encabezados
    let thead = '<thead><tr><th class="stat-header">Stat</th>';
    pokemons.forEach(pokemon => {
        thead += `
            <th class="pokemon-header">
                <div class="pokemon-header-content">
                    <img src="${getPokemonImage(pokemon, currentShinyMode)}" alt="${pokemon.name}" class="pokemon-header-img">
                    <div class="pokemon-header-name">${pokemon.name}</div>
                </div>
            </th>
        `;
    });
    thead += '</tr></thead>';
    table.innerHTML = thead;
    
    // Crear filas de stats
    const tbody = document.createElement('tbody');
    const stats = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
    const statValues = {};
    
    // Calcular valores máximos y mínimos
    stats.forEach(stat => {
        statValues[stat] = pokemons.map(p => p.stats[stat]);
    });
    
    stats.forEach(stat => {
        const row = document.createElement('tr');
        row.className = 'stat-row';
        row.innerHTML = `<td class="stat-name">${statNames[stat]}</td>`;
        
        const values = statValues[stat];
        const maxValue = Math.max(...values);
        const minValue = Math.min(...values);
        
        pokemons.forEach(pokemon => {
            const value = pokemon.stats[stat];
            let className = 'stat-value';
            
            if (value === maxValue) className += ' highest';
            if (value === minValue) className += ' lowest';
            
            row.innerHTML += `<td class="${className}">${value}</td>`;
        });
        
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    
    // Actualizar resumen
    updateComparisonSummary(pokemons);
}

// Actualizar resumen comparativo
function updateComparisonSummary(pokemons) {
    const summary = document.getElementById('comparison-stats-summary');
    if (!summary) return;
    
    const totalStats = pokemons.map(p => 
        Object.values(p.stats).reduce((a, b) => a + b, 0)
    );
    
    const maxTotal = Math.max(...totalStats);
    const minTotal = Math.min(...totalStats);
    const avgTotal = totalStats.reduce((a, b) => a + b, 0) / totalStats.length;
    
    summary.innerHTML = `
        <div class="summary-item">
            <span class="summary-label">Mejor BST:</span>
            <span class="summary-value">${maxTotal}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Peor BST:</span>
            <span class="summary-value">${minTotal}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">BST Promedio:</span>
            <span class="summary-value">${Math.round(avgTotal)}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Pokémon comparados:</span>
            <span class="summary-value">${pokemons.length}/6</span>
        </div>
    `;
}

// Actualizar gráfico radar
function updateRadarChart() {
    const canvas = document.getElementById('radar-chart');
    const legend = document.getElementById('radar-legend');
    
    if (!canvas) return;
    
    const pokemons = comparisonGroup.filter(p => p !== null);
    
    if (pokemons.length < 2) {
        canvas.style.display = 'none';
        legend.innerHTML = '<div style="text-align: center; color: var(--pokedex-gray); padding: 40px;">Selecciona al menos 2 Pokémon para el gráfico</div>';
        return;
    }
    
    canvas.style.display = 'block';
    
    // Aumentar el tamaño del canvas
    canvas.width = 600;
    canvas.height = 500;
    // Verificar si Chart.js está disponible
    if (typeof Chart === 'undefined') {
        canvas.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--pokedex-gray);">Chart.js no está disponible. Recarga la página.</div>';
        return;
    }
    
    // Colores para cada Pokémon
    const colors = ['#e3350d', '#30a7d7', '#f7d02c', '#78C850', '#A040A0', '#F85888'];
    
    // Configurar datos del gráfico
    const stats = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
    const statLabels = stats.map(stat => getStatName(stat));
    
    const datasets = pokemons.map((pokemon, index) => {
        return {
            label: pokemon.name,
            data: stats.map(stat => {
                // Obtener el valor de la estadística correctamente
                if (pokemon.stats && typeof pokemon.stats === 'object') {
                    return pokemon.stats[stat] || 0;
                }
                return 0;
            }),
            borderColor: colors[index % colors.length],
            backgroundColor: colors[index % colors.length] + '20',
            pointBackgroundColor: colors[index % colors.length],
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: colors[index % colors.length],
            borderWidth: 2,
            pointRadius: 4
        };
    });
    
    // Crear leyenda
    legend.innerHTML = '';
    pokemons.forEach((pokemon, index) => {
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        legendItem.innerHTML = `
            <div class="legend-color" style="background: ${colors[index % colors.length]}"></div>
            <div class="legend-name">${pokemon.name}</div>
        `;
        legend.appendChild(legendItem);
    });
    
    const ctx = canvas.getContext('2d');
    
    // Destruir gráfico anterior si existe
    if (canvas.chart) {
        canvas.chart.destroy();
    }
    
    try {
        canvas.chart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: statLabels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: {
                            display: true
                        },
                        suggestedMin: 0,
                        suggestedMax: 150,
                        ticks: {
                            stepSize: 30
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.raw}`;
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error creando gráfico radar:', error);
        canvas.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--pokedex-gray);">Error al crear el gráfico</div>';
    }
}

// Actualizar análisis de tipos
function updateTypeAnalysis() {
    const coverage = document.getElementById('type-coverage-analysis');
    const weaknesses = document.getElementById('shared-weaknesses');
    const balance = document.getElementById('type-balance');
    
    if (!coverage) return;
    
    const pokemons = comparisonGroup.filter(p => p !== null);
    
    if (pokemons.length < 2) {
        coverage.innerHTML = '<div style="text-align: center; color: var(--pokedex-gray);">Selecciona al menos 2 Pokémon</div>';
        weaknesses.innerHTML = '';
        balance.innerHTML = '';
        return;
    }
    
    // Análisis de cobertura de tipos
    const typeCoverage = {};
    pokemons.forEach(pokemon => {
        pokemon.types.forEach(type => {
            typeCoverage[type] = (typeCoverage[type] || 0) + 1;
        });
    });
    
    coverage.innerHTML = Object.entries(typeCoverage)
        .sort((a, b) => b[1] - a[1])
        .map(([type, count]) => `
            <div class="coverage-item">
                <span class="type-badge type-${type}">${typeTranslations[type]}</span>
                <span class="coverage-count">${count} Pokémon</span>
            </div>
        `).join('');
    
    // Análisis de debilidades comunes
    updateSharedWeaknesses(pokemons);
    
    // Balance de tipos
    updateTypeBalance(typeCoverage);
}

// Actualizar debilidades comunes
function updateSharedWeaknesses(pokemons) {
    const weaknessesElem = document.getElementById('shared-weaknesses');
    if (!weaknessesElem) return;
    
    // Calcular efectividad grupal CORREGIDA
    const groupEffectiveness = {};
    Object.keys(typeTranslations).forEach(attackType => {
        let maxMultiplier = 0;
        let minMultiplier = 4;
        
        pokemons.forEach(pokemon => {
            let pokemonMultiplier = 1;
            pokemon.types.forEach(defenseType => {
                pokemonMultiplier *= typeEffectiveness[attackType][defenseType];
            });
            
            maxMultiplier = Math.max(maxMultiplier, pokemonMultiplier);
            minMultiplier = Math.min(minMultiplier, pokemonMultiplier);
        });
        
        // Para debilidades usamos el máximo (lo peor para el grupo)
        // Para resistencias usamos el mínimo (lo mejor para el grupo)
        groupEffectiveness[attackType] = {
            weakness: maxMultiplier,
            resistance: minMultiplier
        };
    });
    
    // Categorizar CORREGIDO
    const strongAgainst = Object.entries(groupEffectiveness)
        .filter(([_, multipliers]) => multipliers.weakness >= 2)
        .map(([type]) => type);
    
    const weakAgainst = Object.entries(groupEffectiveness)
        .filter(([_, multipliers]) => multipliers.resistance <= 0.5 && multipliers.resistance > 0)
        .map(([type]) => type);
    
    const immuneAgainst = Object.entries(groupEffectiveness)
        .filter(([_, multipliers]) => multipliers.resistance === 0)
        .map(([type]) => type);
    
    const neutralAgainst = Object.entries(groupEffectiveness)
        .filter(([_, multipliers]) => 
            multipliers.weakness < 2 && 
            multipliers.resistance > 0.5 &&
            multipliers.resistance > 0
        )
        .map(([type]) => type);
    
    weaknessesElem.innerHTML = `
        <div class="weakness-category weak">
            <div class="weakness-title">⚠️ Débil contra (${strongAgainst.length})</div>
            <div class="weakness-types">
                ${strongAgainst.map(type => 
                    `<span class="type-badge type-${type}">${typeTranslations[type]}</span>`
                ).join('')}
            </div>
        </div>
        <div class="weakness-category resistant">
            <div class="weakness-title">🛡️ Resistente contra (${weakAgainst.length})</div>
            <div class="weakness-types">
                ${weakAgainst.map(type => 
                    `<span class="type-badge type-${type}">${typeTranslations[type]}</span>`
                ).join('')}
            </div>
        </div>
        <div class="weakness-category immune">
            <div class="weakness-title">🚫 Inmune contra (${immuneAgainst.length})</div>
            <div class="weakness-types">
                ${immuneAgainst.map(type => 
                    `<span class="type-badge type-${type}">${typeTranslations[type]}</span>`
                ).join('')}
            </div>
        </div>
        <div class="weakness-category neutral">
            <div class="weakness-title">⚪ Neutral contra (${neutralAgainst.length})</div>
            <div class="weakness-types">
                ${neutralAgainst.map(type => 
                    `<span class="type-badge type-${type}">${typeTranslations[type]}</span>`
                ).join('')}
            </div>
        </div>
    `;
}

// Actualizar balance de tipos
function updateTypeBalance(typeCoverage) {
    const balanceElem = document.getElementById('type-balance');
    if (!balanceElem) return;
    
    balanceElem.innerHTML = Object.entries(typeCoverage)
        .map(([type, count]) => `
            <div class="type-count">
                <span class="type-badge type-${type}">${typeTranslations[type]}</span>
                <span>×${count}</span>
            </div>
        `).join('');
}

// Actualizar vista side-by-side
function updateSideBySideView() {
    const container = document.getElementById('sidebyside-container');
    if (!container) return;
    
    const pokemons = comparisonGroup.filter(p => p !== null);
    
    if (pokemons.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--pokedex-gray);">Selecciona Pokémon para comparar</div>';
        return;
    }
    
    container.innerHTML = pokemons.map(pokemon => `
        <div class="sidebyside-pokemon">
            <div class="sidebyside-header">
                <img src="${getPokemonImage(pokemon, currentShinyMode)}" alt="${pokemon.name}" class="sidebyside-img">
                <div class="sidebyside-info">
                    <div class="sidebyside-name">${pokemon.name}</div>
                    <div class="sidebyside-id">#${pokemon.id.toString().padStart(3, '0')}</div>
                    <div class="sidebyside-types">
                        ${pokemon.types.map(type => 
                            `<span class="type-badge type-${type}">${typeTranslations[type]}</span>`
                        ).join('')}
                    </div>
                </div>
            </div>
            <div class="sidebyside-stats">
                ${Object.entries(pokemon.stats).map(([stat, value]) => `
                    <div class="sidebyside-stat">
                        <span>${statNames[stat]}:</span>
                        <span>${value}</span>
                        <div class="stat-bar-container">
                            <div class="stat-bar" style="width: ${(value / 150) * 100}%"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

// Configurar acciones rápidas
function setupQuickActions() {
    document.getElementById('compare-from-team').addEventListener('click', useTeamForComparison);
    document.getElementById('compare-random').addEventListener('click', addRandomPokemon);
    document.getElementById('compare-by-type').addEventListener('click', showTypeBasedComparison);
    
    document.getElementById('export-comparison').addEventListener('click', exportComparisonGroup);
    document.getElementById('import-comparison').addEventListener('click', importComparisonGroup);
    document.getElementById('save-comparison-group').addEventListener('click', saveComparisonGroup);
    document.getElementById('clear-comparison').addEventListener('click', clearComparisonGroup);
}

// Usar equipo actual para comparación
function useTeamForComparison() {
    playSound(selectSound);
    comparisonGroup = [...currentTeam];
    updateComparisonSlots();
    updateComparisonViews();
}

// Añadir Pokémon aleatorio
function addRandomPokemon() {
    playSound(selectSound);
    const emptySlots = comparisonGroup.reduce((slots, pokemon, index) => {
        if (!pokemon) slots.push(index);
        return slots;
    }, []);
    
    if (emptySlots.length === 0) {
        alert('No hay espacios vacíos en la comparación');
        return;
    }
    
    const randomIndex = Math.floor(Math.random() * allPokemonData.length);
    const randomPokemon = allPokemonData[randomIndex];
    const slotIndex = emptySlots[0];
    
    comparisonGroup[slotIndex] = randomPokemon;
    updateComparisonSlots();
    updateComparisonViews();
}

// Mostrar comparación por tipo
function showTypeBasedComparison() {
    // Crear modal para seleccionar tipo
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.8); display: flex; justify-content: center;
        align-items: center; z-index: 10004;
    `;
    
    modal.innerHTML = `
        <div style="background: var(--modal-bg); padding: 20px; border-radius: 15px; max-width: 500px; width: 90%;">
            <h3 style="color: var(--text-color); margin-bottom: 15px; text-align: center;">Selecciona un tipo</h3>
            <div class="type-filters" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                ${Object.entries(typeTranslations).map(([typeKey, typeName]) => `
                    <button class="type-filter type-badge type-${typeKey}" data-type="${typeKey}" style="padding: 10px; border: none; border-radius: 5px; cursor: pointer;">
                        ${typeName}
                    </button>
                `).join('')}
            </div>
            <div style="text-align: center; margin-top: 15px;">
                <button class="pokedex-button secondary" onclick="this.parentElement.parentElement.remove()">Cancelar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event listeners para los botones de tipo
    modal.querySelectorAll('.type-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            const typeKey = btn.dataset.type;
            const pokemonOfType = allPokemonData.filter(p => 
                p.types.includes(typeKey)
            );
            
            // Seleccionar 6 aleatorios
            const randomPokemon = [];
            const shuffled = [...pokemonOfType].sort(() => 0.5 - Math.random());
            for (let i = 0; i < Math.min(6, shuffled.length); i++) {
                randomPokemon.push(shuffled[i]);
            }
            
            // Rellenar los slots
            comparisonGroup = [...randomPokemon, ...Array(6 - randomPokemon.length).fill(null)];
            updateComparisonSlots();
            updateComparisonViews();
            modal.remove();
            playSound(selectSound);
        });
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

function setupComparisonModal() {
    const compareModal = document.getElementById('compare-modal');
    const closeButton = compareModal.querySelector('.close-button');
    
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            playSound(clickSound);
            compareModal.style.display = 'none';
        });
    }
    
    compareModal.addEventListener('click', (e) => {
        if (e.target === compareModal) {
            playSound(clickSound);
            compareModal.style.display = 'none';
        }
    });
}

// Exportar grupo de comparación
function exportComparisonGroup() {
    const pokemonIds = comparisonGroup.filter(p => p !== null).map(p => p.id);
    const dataStr = JSON.stringify(pokemonIds);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportLink = document.createElement('a');
    exportLink.setAttribute('href', dataUri);
    exportLink.setAttribute('download', 'pokemon_comparison_group.json');
    document.body.appendChild(exportLink);
    exportLink.click();
    document.body.removeChild(exportLink);
    
    playSound(selectSound);
}

// Importar grupo de comparación
function importComparisonGroup() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        
        reader.onload = event => {
            try {
                const pokemonIds = JSON.parse(event.target.result);
                comparisonGroup = pokemonIds.map(id => 
                    allPokemonData.find(p => p.id === id) || null
                ).slice(0, 6);
                
                // Rellenar con null si es necesario
                while (comparisonGroup.length < 6) {
                    comparisonGroup.push(null);
                }
                
                updateComparisonSlots();
                updateComparisonViews();
                playSound(selectSound);
            } catch (error) {
                alert('Error al importar el archivo');
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

// Guardar grupo de comparación
function saveComparisonGroup() {
    const groupName = prompt('Nombre para este grupo de comparación:');
    if (!groupName) return;
    
    const pokemonIds = comparisonGroup.filter(p => p !== null).map(p => p.id);
    
    const group = {
        name: groupName,
        pokemonIds: pokemonIds,
        date: new Date().toISOString()
    };
    
    savedComparisonGroups.push(group);
    saveComparisonGroupsToStorage();
    playSound(selectSound);
    
    alert(`Grupo "${groupName}" guardado correctamente`);
}

// Limpiar grupo de comparación
function clearComparisonGroup() {
    playSound(clickSound);
    if (confirm('¿Estás seguro de que quieres limpiar toda la comparación?')) {
        comparisonGroup = Array(6).fill(null);
        updateComparisonSlots();
        updateComparisonViews();
        saveComparisonToStorage();
        showTeamNotification('Comparación limpiada');
    }
}

// Cargar grupos guardados
function loadComparisonGroups() {
    try {
        const stored = localStorage.getItem('pokedex-comparison-groups');
        if (stored) {
            savedComparisonGroups = JSON.parse(stored);
        }
    } catch (error) {
        savedComparisonGroups = [];
    }
}

// Guardar grupos de comparación
function saveComparisonGroupsToStorage() {
    try {
        localStorage.setItem('pokedex-comparison-groups', JSON.stringify(savedComparisonGroups));
    } catch (error) {
        console.error('Error guardando grupos de comparación:', error);
    }
}

// Guardar comparación actual
function saveComparisonToStorage() {
    try {
        const pokemonIds = comparisonGroup.filter(p => p !== null).map(p => p.id);
        localStorage.setItem('pokedex-comparison-multiple', JSON.stringify(pokemonIds));
    } catch (error) {
        console.error('Error guardando comparación:', error);
    }
}

// Cargar comparación guardada
function loadComparisonFromStorage() {
    try {
        const stored = localStorage.getItem('pokedex-comparison-multiple');
        if (stored) {
            const pokemonIds = JSON.parse(stored);
            comparisonGroup = pokemonIds.map(id => 
                allPokemonData.find(p => p.id === id) || null
            ).slice(0, 6);
            
            while (comparisonGroup.length < 6) {
                comparisonGroup.push(null);
            }
        }
    } catch (error) {
        comparisonGroup = Array(6).fill(null);
    }
}

// Mostrar modal de comparación
function showCompareModal() {
    const compareModal = document.getElementById('compare-modal');
    if (compareModal) {
        compareModal.style.display = 'flex';
        updateComparisonSlots();
        updateComparisonViews();
    }
}


// ===== SISTEMA DE AUTENTICACIÓN =====
function setupAuth() {
    const authModal = document.getElementById('auth-modal');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const authTabs = document.querySelectorAll('.auth-tab');
    const profileModal = document.getElementById('profile-modal');
    
    if (authModal) authModal.style.display = 'none';
    if (profileModal) profileModal.style.display = 'none';
    
    showPokedex();
    updateUserBar();
    
    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            
            authTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
            document.getElementById(`${tabName}-form`).classList.add('active');
            
            const errorElement = document.getElementById(`${tabName}-error`);
            if (errorElement) errorElement.textContent = '';
        });
    });
    
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('login-username').value.trim();
            const password = document.getElementById('login-password').value;
            const errorElement = document.getElementById('login-error');
            
            if (!username || !password) {
                if (errorElement) errorElement.textContent = 'Usuario y contraseña son requeridos';
                return;
            }
            
            try {
                const result = await userManager.login(username, password);
                console.log('Login response:', result);
                if (result.debug) {
                    console.log('Login debug info:', result.debug);
                }
                
                if (result.success && result.data) {
                    currentUser = result.data;
                    PokedexState.user.current = currentUser;
                    saveToStorage();
                    loadUserData();
                    showPokedex();
                    if (authModal) authModal.style.display = 'none';
                    updateUserBar();
                } else {
                    if (errorElement) errorElement.textContent = result.message || 'Error al iniciar sesión';
                }
            } catch (error) {
                console.error('Login error:', error);
                if (errorElement) errorElement.textContent = 'Error de conexión al servidor';
            }
        });
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('register-username').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('register-confirm-password').value;
            const errorElement = document.getElementById('register-error');
            
            if (password !== confirmPassword) {
                if (errorElement) errorElement.textContent = 'Las contraseñas no coinciden';
                return;
            }
            
            const result = await userManager.register(username, email, password);
            
            if (result.success) {
                if (errorElement) errorElement.textContent = result.message;
                document.querySelector('.auth-tab[data-tab="login"]').click();
                document.getElementById('login-username').value = username;
            } else {
                if (errorElement) errorElement.textContent = result.message;
            }
        });
    }
    
    document.getElementById('continue-without-login')?.addEventListener('click', () => {
        if (authModal) authModal.style.display = 'none';
        showPokedex();
        updateUserBar();
    });
    
    document.getElementById('login-btn')?.addEventListener('click', showAuthModal);
    document.getElementById('edit-profile-btn')?.addEventListener('click', showProfileModal);
    
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
        await userManager.logout();
        currentUser = null;
        showPokedex();
        updateUserBar();
    });
    
    document.getElementById('save-profile-btn')?.addEventListener('click', saveProfile);
    document.getElementById('cancel-profile-btn')?.addEventListener('click', () => {
        if (profileModal) profileModal.style.display = 'none';
    });
    
    document.getElementById('change-avatar-btn')?.addEventListener('click', () => {
        document.getElementById('avatar-upload').click();
    });
    
    document.getElementById('avatar-upload')?.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const base64Avatar = await userManager.avatarToBase64(file);
                document.getElementById('profile-avatar').src = base64Avatar;
            } catch (error) {
                document.getElementById('profile-error').textContent = 'Error al cargar la imagen';
            }
        }
    });
    
    window.addEventListener('click', (e) => {
        if (authModal && e.target === authModal) authModal.style.display = 'none';
        if (profileModal && e.target === profileModal) profileModal.style.display = 'none';
    });
}

function showAuthModal() {
    const authModal = document.getElementById('auth-modal');
    if (authModal) {
        authModal.style.display = 'flex';
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';
        document.getElementById('login-error').textContent = '';
        document.querySelector('.auth-tab[data-tab="login"]').click();
    }
}

function showPokedex() {
    const pokedexContainer = document.getElementById('pokedex-container');
    const userBar = document.getElementById('user-bar');
    
    if (pokedexContainer) pokedexContainer.style.display = 'flex';
    if (userBar) userBar.style.display = 'flex';
}

function updateUserBar() {
    const userBar = document.getElementById('user-bar');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const editProfileBtn = document.getElementById('edit-profile-btn');
    const usernameDisplay = document.getElementById('username-display');
    const userAvatar = document.getElementById('user-avatar');
    
    if (!userBar) return;
    
    if (currentUser) {
        if (userAvatar) userAvatar.src = currentUser.avatar;
        if (usernameDisplay) usernameDisplay.textContent = currentUser.username;
        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'block';
        if (editProfileBtn) editProfileBtn.style.display = 'block';
    } else {
        if (userAvatar) userAvatar.src = userManager.generateDefaultAvatar('Invitado');
        if (usernameDisplay) usernameDisplay.textContent = 'Invitado';
        if (loginBtn) loginBtn.style.display = 'block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (editProfileBtn) editProfileBtn.style.display = 'none';
    }
}

function loadUserData() {
    if (!currentUser) return;
    favorites = new Set(currentUser.favorites.map(Number));
    captured = new Set(currentUser.captured.map(Number));
    renderPokemonList(filteredPokemonData);
}

function showProfileModal() {
    const profileModal = document.getElementById('profile-modal');
    const profileAvatar = document.getElementById('profile-avatar');
    const profileUsername = document.getElementById('profile-username');
    const profileEmail = document.getElementById('profile-email');
    
    if (!profileModal) return;
    
    if (currentUser) {
        if (profileAvatar) profileAvatar.src = currentUser.avatar;
        if (profileUsername) profileUsername.value = currentUser.username;
        if (profileEmail) profileEmail.value = currentUser.email;
        
        document.getElementById('current-password').value = '';
        document.getElementById('new-password').value = '';
        document.getElementById('profile-error').textContent = '';
        
        profileModal.style.display = 'flex';
    } else {
        document.getElementById('profile-error').textContent = 'Debes iniciar sesión para editar tu perfil';
    }
}

async function saveProfile() {
    if (!currentUser) {
        document.getElementById('profile-error').textContent = 'Debes iniciar sesión para editar tu perfil';
        return;
    }
    
    const profileUsername = document.getElementById('profile-username');
    const profileEmail = document.getElementById('profile-email');
    const currentPassword = document.getElementById('current-password');
    const newPassword = document.getElementById('new-password');
    const errorElement = document.getElementById('profile-error');
    
    if (!profileUsername || !profileEmail || !errorElement) return;
    
    const username = profileUsername.value;
    const email = profileEmail.value;
    const newPass = newPassword ? newPassword.value : '';
    
    if (username.length < 3) {
        errorElement.textContent = 'El nombre de usuario debe tener al menos 3 caracteres';
        return;
    }
    
    const updatedUser = {
        username: username,
        email: email,
        avatar: document.getElementById('profile-avatar').src
    };
    
    if (newPass) updatedUser.password = newPass;
    
    const result = await userManager.updateProfile(updatedUser);
    
    if (result.success) {
        currentUser.username = username;
        currentUser.email = email;
        currentUser.avatar = updatedUser.avatar;
        
        updateUserBar();
        document.getElementById('profile-modal').style.display = 'none';
    } else {
        errorElement.textContent = result.message;
    }
}

// ===== FUNCIONES UTILITARIAS =====
function playSound(soundElement) {
    if (!soundEnabled) return;
    
    try {
        if (soundElement === clickSound) {
            generateUISound('click');
        } else if (soundElement === hoverSound) {
            generateUISound('hover');
        } else if (soundElement === selectSound) {
            generateUISound('select');
        } else if (soundElement && soundElement.play) {
            soundElement.currentTime = 0;
            soundElement.play().catch(() => {});
        }
    } catch (error) {}
}

function playPokemonCry(pokemon) {
    if (!soundEnabled || !pokemon) return;
    
    try {
        const cryUrl = `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${pokemon.id}.ogg`;
        if (pokemonCry) {
            pokemonCry.src = cryUrl;
            pokemonCry.volume = globalVolume;
            pokemonCry.currentTime = 0;
            pokemonCry.play().catch(() => {
                console.log('No se pudo reproducir el sonido del Pokémon');
            });
        }
    } catch (error) {
        console.error('Error al reproducir cry:', error);
    }
}

function showRandomPokemon() {
    playSound(selectSound);
    if (allPokemonData.length === 0) {
        console.log("No hay datos de Pokémon cargados aún");
        return;
    }
    
    // Si hay filtros aplicados, elegir aleatorio de los Pokémon filtrados
    let pokemonList = filteredPokemonData.length > 0 ? filteredPokemonData : allPokemonData;
    
    if (pokemonList.length === 0) {
        alert("No hay Pokémon que coincidan con los filtros actuales");
        return;
    }
    
    const randomIndex = Math.floor(Math.random() * pokemonList.length);
    const randomPokemon = pokemonList[randomIndex];
    
    // Encontrar el índice en allPokemonData (no en filteredPokemonData)
    const actualIndex = allPokemonData.findIndex(p => p.id === randomPokemon.id);
    
    if (actualIndex !== -1) {
        showPokemonDetails(actualIndex);
        // Scroll suave hacia el Pokémon en la lista
        const pokemonCard = document.querySelector(`.pokemon-card[data-id="${randomPokemon.id}"]`);
        if (pokemonCard) {
            pokemonCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Efecto visual temporal
            pokemonCard.style.boxShadow = '0 0 20px gold';
            setTimeout(() => {
                pokemonCard.style.boxShadow = '';
            }, 2000);
        }
    }
}

function ensureFloatingButtonsVisible() {
    const teamBtn = document.getElementById('team-btn');
    
    if (teamBtn) {
        teamBtn.style.display = 'block';
        teamBtn.style.visibility = 'visible';
        teamBtn.style.opacity = '1';
        teamBtn.style.position = 'fixed';
        teamBtn.style.zIndex = '9999';
        teamBtn.style.left = '20px';
        teamBtn.style.bottom = '20px';
    }
}

function setupModalCloseButtons() {
    const modals = ['history-modal', 'compare-modal', 'team-modal', 'auth-modal', 'profile-modal', 'pokemon-3d-modal'];
    
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal) {
            const closeButton = modal.querySelector('.close-button');
            if (closeButton) {
                closeButton.onclick = () => {
                    playSound(clickSound);
                    if (modalId === 'pokemon-3d-modal') {
                        cleanupThreeJSViewer();
                    }
                    modal.style.display = 'none';
                };
            }
            
            modal.onclick = (e) => {
                if (e.target === modal) {
                    playSound(clickSound);
                    if (modalId === 'pokemon-3d-modal') {
                        cleanupThreeJSViewer();
                    }
                    modal.style.display = 'none';
                }
            };
        }
    });
}

function cleanupThreeJSViewer() {
    if (currentThreeJSRenderer) {
        currentThreeJSRenderer.dispose();
        currentThreeJSRenderer = null;
    }
    if (currentThreeJSControls) {
        currentThreeJSControls.dispose();
        currentThreeJSControls = null;
    }
    if (currentThreeJSModel) {
        currentThreeJSModel = null;
    }
    if (currentThreeJSScene) {
        currentThreeJSScene.clear();
        currentThreeJSScene = null;
    }
    if (currentThreeJSCamera) {
        currentThreeJSCamera = null;
    }
    const viewer = document.getElementById('pokemon-3d-viewer');
    if (viewer) {
        viewer.innerHTML = '';
    }
}

// ===== SISTEMA DE BÚSQUEDA AVANZADA =====

// Variables globales para búsqueda avanzada
let advancedSearchState = {
    filters: {
        types: [],
        typeRelationship: 'any',
        stats: {},
        physical: {},
        generations: [],
        regions: [],
        ability: '',
        move: '',
        moveType: ''
    },
    savedSearches: [],
    searchHistory: []
};

// Inicializar sistema de búsqueda avanzada
function setupAdvancedSearch() {
    const advancedSearchBtn = document.getElementById('advanced-search-btn');
    const advancedSearchModal = document.getElementById('advanced-search-modal');
    
    if (!advancedSearchBtn || !advancedSearchModal) return;

    // Botón de búsqueda avanzada
    advancedSearchBtn.addEventListener('click', (e) => {
        playSound(clickSound);
        showAdvancedSearchModal();
    });

    // Cerrar modal
    const closeButton = advancedSearchModal.querySelector('.close-button');
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            playSound(clickSound);
            advancedSearchModal.style.display = 'none';
        });
    }

    document.getElementById('close-advanced-search').addEventListener('click', () => {
        playSound(clickSound);
        advancedSearchModal.style.display = 'none';
    });

    advancedSearchModal.addEventListener('click', (e) => {
        if (e.target === advancedSearchModal) {
            playSound(clickSound);
            advancedSearchModal.style.display = 'none';
        }
    });

    // Inicializar componentes
    setupAdvancedTypeFilters();
    setupFilterAccordion();
    setupAdvancedSearchActions();
    
    // Cargar datos guardados
    loadSavedSearches();
    loadSearchHistory();
}

// Mostrar modal de búsqueda avanzada
function showAdvancedSearchModal() {
    const advancedSearchModal = document.getElementById('advanced-search-modal');
    if (advancedSearchModal) {
        advancedSearchModal.style.display = 'flex';
        applyAdvancedSearch(); // Mostrar todos los Pokémon inicialmente
        updateSearchHistoryDisplay();
    }
}

function setupAdvancedTypeFilters() {
    const typeFiltersContainer = document.getElementById('advanced-type-filters');
    if (!typeFiltersContainer) return;
    
    typeFiltersContainer.innerHTML = '';
    
    Object.entries(typeTranslations).forEach(([typeKey, typeName]) => {
        const typeButton = document.createElement('button');
        typeButton.type = 'button';
        typeButton.className = `advanced-type-filter type-${typeKey}`;
        typeButton.textContent = typeName;
        typeButton.dataset.type = typeKey;
        
        typeButton.addEventListener('click', (e) => {
            e.preventDefault();
            playSound(clickSound);
            typeButton.classList.toggle('selected');
            updateAdvancedTypeFilters();
            applyAdvancedSearch();
        });
        
        typeFiltersContainer.appendChild(typeButton);
    });
    
    const typeRelationship = document.getElementById('type-relationship');
    if (typeRelationship) {
        typeRelationship.addEventListener('change', () => {
            advancedSearchState.filters.typeRelationship = typeRelationship.value;
            applyAdvancedSearch();
        });
    }
    
    const typeRelationshipRadios = document.querySelectorAll('input[name="type-mode"]');
    typeRelationshipRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            advancedSearchState.filters.typeRelationship = radio.value;
            applyAdvancedSearch();
        });
    });
    
    setupMoveTypeFilter();
}

// Configurar filtro de tipo de movimiento
function setupMoveTypeFilter() {
    const moveTypeFilter = document.getElementById('move-type-filter');
    if (!moveTypeFilter) return;
    
    moveTypeFilter.innerHTML = '<option value="">Cualquier tipo</option>';
    
    Object.entries(typeTranslations).forEach(([typeKey, typeName]) => {
        const option = document.createElement('option');
        option.value = typeKey;
        option.textContent = typeName;
        moveTypeFilter.appendChild(option);
    });
    
    moveTypeFilter.addEventListener('change', () => {
        advancedSearchState.filters.moveType = moveTypeFilter.value;
    });
}

function setupFilterAccordion() {
    const filterGroups = document.querySelectorAll('.filter-group');
    
    filterGroups.forEach(group => {
        const header = group.querySelector('.filter-group-header');
        if (!header) return;
        
        header.addEventListener('click', (e) => {
            e.preventDefault();
            
            const isActive = group.classList.contains('active');
            
            if (isActive) {
                group.classList.remove('active');
            } else {
                filterGroups.forEach(g => g.classList.remove('active'));
                group.classList.add('active');
            }
            
            playSound(clickSound);
        });
    });
}

function updateAdvancedTypeFilters() {
    const selectedTypeFilters = document.querySelectorAll('#advanced-type-filters .advanced-type-filter.selected');
    advancedSearchState.filters.types = Array.from(selectedTypeFilters).map(button => button.dataset.type);
}

// Configurar acciones de búsqueda avanzada (versión segura)
function setupAdvancedSearchActions() {
    const applyBtn = document.getElementById('apply-advanced-search');
    if (applyBtn) applyBtn.addEventListener('click', () => applyAdvancedSearch(true));

    const resetBtn = document.getElementById('reset-advanced-search');
    if (resetBtn) resetBtn.addEventListener('click', resetAdvancedSearch);

    setupRealTimeFilters();
}

// Configurar filtros en tiempo real
function setupRealTimeFilters() {
    // Stats
    const stats = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed', 'total'];
    stats.forEach(stat => {
        const minInput = document.getElementById(`stat-${stat}-min`);
        const maxInput = document.getElementById(`stat-${stat}-max`);
        
        if (minInput && maxInput) {
            const updateStatFilter = () => {
                if (!advancedSearchState.filters.stats) {
                    advancedSearchState.filters.stats = {};
                }
                advancedSearchState.filters.stats[stat] = {
                    min: minInput.value ? parseInt(minInput.value) : null,
                    max: maxInput.value ? parseInt(maxInput.value) : null
                };
                applyAdvancedSearch();
            };
            
            minInput.addEventListener('input', updateStatFilter);
            maxInput.addEventListener('input', updateStatFilter);
        }
    });
    
    // Características físicas
    const heightMin = document.getElementById('height-min');
    const heightMax = document.getElementById('height-max');
    const weightMin = document.getElementById('weight-min');
    const weightMax = document.getElementById('weight-max');
    const colorFilter = document.getElementById('color-filter');
    
    if (heightMin && heightMax) {
        const updatePhysicalFilters = () => {
            advancedSearchState.filters.physical = {
                height: {
                    min: heightMin.value ? parseFloat(heightMin.value) : null,
                    max: heightMax.value ? parseFloat(heightMax.value) : null
                },
                weight: {
                    min: weightMin.value ? parseFloat(weightMin.value) : null,
                    max: weightMax.value ? parseFloat(weightMax.value) : null
                },
                color: colorFilter ? colorFilter.value : ''
            };
            applyAdvancedSearch();
        };
        
        heightMin.addEventListener('input', updatePhysicalFilters);
        heightMax.addEventListener('input', updatePhysicalFilters);
        weightMin.addEventListener('input', updatePhysicalFilters);
        weightMax.addEventListener('input', updatePhysicalFilters);
        if (colorFilter) colorFilter.addEventListener('change', updatePhysicalFilters);
    }
    
    const generationFilter = document.getElementById('generation-filter');
    const regionFilter = document.getElementById('region-filter-advanced');
    
    if (generationFilter) {
        generationFilter.addEventListener('change', () => {
            advancedSearchState.filters.generations = Array.from(generationFilter.selectedOptions).map(opt => opt.value);
            applyAdvancedSearch();
        });
    }
    
    if (regionFilter) {
        regionFilter.addEventListener('change', () => {
            advancedSearchState.filters.regions = Array.from(regionFilter.selectedOptions).map(opt => opt.value);
            applyAdvancedSearch();
        });
    }
    
    const abilityFilter = document.getElementById('ability-filter');
    const moveFilter = document.getElementById('move-filter');
    
    if (abilityFilter) {
        abilityFilter.addEventListener('input', (e) => {
            advancedSearchState.filters.ability = e.target.value.toLowerCase();
            applyAdvancedSearch();
        });
    }
    
    if (moveFilter) {
        moveFilter.addEventListener('input', (e) => {
            advancedSearchState.filters.move = e.target.value.toLowerCase();
            applyAdvancedSearch();
        });
    }
}

// Mostrar resultados tras aplicar búsqueda avanzada
function showSearchResults(results) {
    const modalFilters = document.getElementById('advanced-search-modal');
    const modalResults = document.getElementById('search-results-modal');
    const resultsGrid = document.getElementById('results-grid');
    
    // Ocultar filtros
    modalFilters.style.display = 'none';
    // Mostrar resultados
    modalResults.style.display = 'block';

    // Limpiar resultados previos
    resultsGrid.innerHTML = '';

    if (!results || results.length === 0) {
        resultsGrid.innerHTML = '<p style="text-align:center;">❌ No se encontraron Pokémon con esos filtros.</p>';
        return;
    }

    // Renderizar los Pokémon filtrados
    results.forEach(pokemon => addPokemonToGridInResults(pokemon));
}

// Renderizado simplificado en el modal de resultados
function addPokemonToGridInResults(pokemon) {
    const grid = document.getElementById('results-grid');
    if (!grid) return;

    const card = document.createElement('div');
    card.className = 'pokemon-card';
    card.innerHTML = `
        <img class="pokemon-img" src="${getPokemonImage(pokemon, currentShinyMode)}" alt="${pokemon.name}" loading="eager">
        <div class="pokemon-id">#${pokemon.id.toString().padStart(3, '0')}</div>
        <div class="pokemon-name">${pokemon.name}</div>
    `;
    
    const imgElement = card.querySelector('.pokemon-img');
    setupImageFallback(imgElement);
    
    card.addEventListener('click', () => showPokemonDetails(allPokemonData.findIndex(p => p.id === pokemon.id)));
    grid.appendChild(card);
}

// Navegación entre ventanas
document.getElementById('back-to-filters').addEventListener('click', () => {
    document.getElementById('search-results-modal').style.display = 'none';
    document.getElementById('advanced-search-modal').style.display = 'block';
});
document.getElementById('close-results').addEventListener('click', () => {
    document.getElementById('search-results-modal').style.display = 'none';
});
document.getElementById('close-results-2').addEventListener('click', () => {
    document.getElementById('search-results-modal').style.display = 'none';
});

function applyAdvancedSearch(showModal = false) {
    updateAdvancedTypeFilters();
    
    const results = allPokemonData.filter(pokemon => {
        if (advancedSearchState.filters.types.length > 0) {
            if (!matchesTypeFilter(pokemon)) {
                return false;
            }
        }
        
        if (advancedSearchState.filters.stats && !matchesStatFilter(pokemon)) {
            return false;
        }
        
        if (advancedSearchState.filters.physical && !matchesPhysicalFilter(pokemon)) {
            return false;
        }
        
        if (advancedSearchState.filters.generations.length > 0) {
            const generation = getGenerationByRegion(pokemon.region);
            if (!advancedSearchState.filters.generations.includes(generation)) {
                return false;
            }
        }
        
        if (advancedSearchState.filters.regions.length > 0) {
            if (!advancedSearchState.filters.regions.includes(pokemon.region)) {
                return false;
            }
        }
        
        if (advancedSearchState.filters.ability && !matchesAbilityFilter(pokemon)) {
            return false;
        }
        
        if (advancedSearchState.filters.move && !matchesMoveFilter(pokemon)) {
            return false;
        }
        
        if (advancedSearchState.filters.moveType && !matchesMoveTypeFilter(pokemon)) {
            return false;
        }
        
        return true;
    });
    
    if (showModal) {
        showSearchResults(results);
    } else {
        displayAdvancedSearchResults(results);
    }
    
    addToSearchHistory(results);
    return results;
}

// Verificar filtro de tipos
function matchesTypeFilter(pokemon) {
    const selectedTypes = advancedSearchState.filters.types;
    const relationship = advancedSearchState.filters.typeRelationship;
    
    switch (relationship) {
        case 'any':
            return selectedTypes.some(type => pokemon.types.includes(type));
        case 'both':
            return selectedTypes.every(type => pokemon.types.includes(type)) && 
                   pokemon.types.length === selectedTypes.length;
        case 'first':
            return pokemon.types[0] && selectedTypes.includes(pokemon.types[0]);
        case 'second':
            return pokemon.types[1] && selectedTypes.includes(pokemon.types[1]);
        case 'exclusive':
            return selectedTypes.every(type => pokemon.types.includes(type));
        default:
            return true;
    }
}

// Verificar filtro de stats
function matchesStatFilter(pokemon) {
    const stats = advancedSearchState.filters.stats;
    
    for (const [stat, range] of Object.entries(stats)) {
        if (range.min === null && range.max === null) continue;
        
        let value;
        if (stat === 'total') {
            value = Object.values(pokemon.stats).reduce((a, b) => a + b, 0);
        } else {
            value = pokemon.stats[stat];
        }
        
        if (range.min !== null && value < range.min) return false;
        if (range.max !== null && value > range.max) return false;
    }
    
    return true;
}

// Verificar filtro de características físicas
function matchesPhysicalFilter(pokemon) {
    const physical = advancedSearchState.filters.physical;
    if (!physical) return true;
    
    // Altura
    if (physical.height) {
        const height = pokemon.height / 10; // Convertir a metros
        if (physical.height.min !== null && height < physical.height.min) return false;
        if (physical.height.max !== null && height > physical.height.max) return false;
    }
    
    // Peso
    if (physical.weight) {
        const weight = pokemon.weight / 10; // Convertir a kg
        if (physical.weight.min !== null && weight < physical.weight.min) return false;
        if (physical.weight.max !== null && weight > physical.weight.max) return false;
    }
    
    // Color (simulado - en una implementación real necesitarías datos de color)
    if (physical.color) {
        // Esta es una simplificación - necesitarías datos de color reales
        const colorMap = {
            'red': [1,4,5,6,37,38,58,59,77,78], // Ejemplo de IDs
            'blue': [7,8,9,54,55,72,73,79,80,90,91,116,117,118,119,120,121,129,130,134,158,159,160,170,171,186,199,215,230,245,258,259,260,270,271,272,278,279,318,319,320,321,339,340,349,350,363,364,365,366,367,368,369,370,382,393,394,395,418,419,422,423,456,457,458,459,460,489,490,501,502,503,515,516,535,536,537,550,564,565,580,581,592,593,594,690,691,692,693,728,729,730],
            'green': [1,2,3,43,44,45,46,47,69,70,71,102,103,114,152,153,154,182,187,188,189,191,192,251,252,253,254,273,274,275,285,286,315,331,332,345,346,357,387,388,389,406,407,420,421,455,459,460,465,470,492,495,496,497,511,512,540,541,542,556,585,586,590,591,597,598,640,648,652,672,673,722,723,724,761,762,763],
            // ... agregar más colores según necesidad
        };
        
        const colorPokemon = colorMap[physical.color] || [];
        if (colorPokemon.length > 0 && !colorPokemon.includes(pokemon.id)) {
            return false;
        }
    }
    
    return true;
}

// Verificar filtro de habilidad
function matchesAbilityFilter(pokemon) {
    if (!advancedSearchState.filters.ability) return true;
    
    const searchTerm = advancedSearchState.filters.ability.toLowerCase();
    return pokemon.abilities.some(ability => 
        ability.toLowerCase().includes(searchTerm)
    );
}

// Verificar filtro de movimiento
function matchesMoveFilter(pokemon) {
    if (!advancedSearchState.filters.move) return true;
    
    const searchTerm = advancedSearchState.filters.move.toLowerCase();
    return pokemon.moves.some(move => 
        move.toLowerCase().includes(searchTerm)
    );
}

// Verificar filtro de tipo de movimiento
function matchesMoveTypeFilter(pokemon) {
    if (!advancedSearchState.filters.moveType) return true;
    
    // Esta es una simplificación - necesitarías datos de tipos de movimientos
    // Por ahora, verificamos si el Pokémon tiene movimientos del tipo especificado
    return pokemon.moves.some(move => {
        // En una implementación real, necesitarías mapear movimientos a sus tipos
        // Por simplicidad, asumimos que algunos movimientos comunes
        const moveTypeMap = {
            'lanzallamas': 'fire',
            'hidrobomba': 'water',
            'rayo': 'electric',
            'latigo cepa': 'grass',
            'ventisca': 'ice',
            'terremoto': 'ground',
            'psiquico': 'psychic',
            'pulso umbrío': 'dark',
            'rayo hielo': 'ice',
            // ... agregar más mapeos
        };
        
        const moveType = moveTypeMap[move.toLowerCase()];
        return moveType === advancedSearchState.filters.moveType;
    });
}

// Obtener generación por región
function getGenerationByRegion(region) {
    const regionToGen = {
        'kanto': '1',
        'johto': '2',
        'hoenn': '3',
        'sinnoh': '4',
        'teselia': '5',
        'kalos': '6',
        'alola': '7',
        'galar': '8',
        'paldea': '9'
    };
    return regionToGen[region] || '1';
}

function displayAdvancedSearchResults(results) {
    const resultsGrid = document.getElementById('results-grid');
    const searchResultsModal = document.getElementById('search-results-modal');
    const advancedSearchModal = document.getElementById('advanced-search-modal');
    
    if (!resultsGrid) return;
    
    resultsGrid.innerHTML = '';
    
    if (results.length === 0) {
        resultsGrid.innerHTML = `
            <div class="empty-results" style="grid-column: 1/-1; padding: 40px 20px; text-align: center;">
                <div class="icon">🔍</div>
                <div>No se encontraron Pokémon</div>
                <div style="font-size: 12px; margin-top: 5px;">Prueba con filtros diferentes</div>
            </div>
        `;
        return;
    }
    
    results.forEach(pokemon => {
        const card = document.createElement('div');
        card.className = 'pokemon-card';
        card.dataset.id = pokemon.id;
        
        const imageUrl = getPokemonImage(pokemon, currentShinyMode, false, currentSpriteMode);
        
        card.innerHTML = `
            <img src="${imageUrl}" alt="${pokemon.name}" class="pokemon-img">
            <div class="pokemon-id">#${pokemon.id.toString().padStart(3, '0')}</div>
            <div class="pokemon-name">${pokemon.name}</div>
        `;
        
        card.addEventListener('click', () => {
            playSound(selectSound);
            const pokemonIndex = allPokemonData.findIndex(p => p.id === pokemon.id);
            if (pokemonIndex !== -1) {
                showPokemonDetails(pokemonIndex);
                if (searchResultsModal) searchResultsModal.style.display = 'none';
                if (advancedSearchModal) advancedSearchModal.style.display = 'none';
            }
        });
        
        resultsGrid.appendChild(card);
    });
}

// Añadir al historial de búsquedas
function addToSearchHistory(results) {
    const searchParams = JSON.stringify(advancedSearchState.filters);
    
    // Evitar duplicados
    const existingIndex = advancedSearchState.searchHistory.findIndex(
        item => item.params === searchParams
    );
    
    if (existingIndex !== -1) {
        advancedSearchState.searchHistory.splice(existingIndex, 1);
    }
    
    const searchEntry = {
        params: searchParams,
        resultsCount: results.length,
        timestamp: Date.now(),
        name: generateSearchName(advancedSearchState.filters)
    };
    
    advancedSearchState.searchHistory.unshift(searchEntry);
    
    // Mantener solo las últimas 10 búsquedas
    if (advancedSearchState.searchHistory.length > 10) {
        advancedSearchState.searchHistory = advancedSearchState.searchHistory.slice(0, 10);
    }
    
    saveSearchHistory();
    updateSearchHistoryDisplay();
}

// Generar nombre para búsqueda
function generateSearchName(filters) {
    const parts = [];
    
    if (filters.types.length > 0) {
        parts.push(`Tipos: ${filters.types.map(t => typeTranslations[t]).join(', ')}`);
    }
    
    if (filters.ability) {
        parts.push(`Habilidad: ${filters.ability}`);
    }
    
    if (filters.move) {
        parts.push(`Movimiento: ${filters.move}`);
    }
    
    if (filters.generations.length > 0) {
        parts.push(`Gen ${filters.generations.join(', ')}`);
    }
    
    if (parts.length === 0) {
        return 'Búsqueda personalizada';
    }
    
    return parts.join(' | ');
}

// Actualizar visualización del historial
function updateSearchHistoryDisplay() {
    const historyContainer = document.querySelector('.search-history');
    const historyList = document.getElementById('search-history-list');
    
    if (!historyList) return;
    
    if (advancedSearchState.searchHistory.length === 0) {
        historyContainer.style.display = 'none';
        return;
    }
    
    historyContainer.style.display = 'block';
    historyList.innerHTML = '';
    
    advancedSearchState.searchHistory.forEach((entry, index) => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
            <div class="history-name">${entry.name}</div>
            <div class="history-count">${entry.resultsCount}</div>
        `;
        
        item.addEventListener('click', () => {
            loadSearchFromHistory(entry);
        });
        
        historyList.appendChild(item);
    });
}

// Cargar búsqueda del historial
function loadSearchFromHistory(entry) {
    try {
        const filters = JSON.parse(entry.params);
        advancedSearchState.filters = filters;
        applyFiltersToUI(filters);
        applyAdvancedSearch();
        playSound(selectSound);
    } catch (error) {
        console.error('Error cargando búsqueda del historial:', error);
    }
}

// Aplicar filtros a la UI
function applyFiltersToUI(filters) {
    // Tipos
    document.querySelectorAll('#advanced-type-filters .advanced-type-filter').forEach(btn => {
        btn.classList.toggle('active', filters.types.includes(btn.dataset.type));
    });
    
    // Relación de tipos
    const typeRelationship = document.getElementById('type-relationship');
    if (typeRelationship) typeRelationship.value = filters.typeRelationship || 'any';
    
    // Stats
    if (filters.stats) {
        Object.entries(filters.stats).forEach(([stat, range]) => {
            const minInput = document.getElementById(`stat-${stat}-min`);
            const maxInput = document.getElementById(`stat-${stat}-max`);
            
            if (minInput) minInput.value = range.min || '';
            if (maxInput) maxInput.value = range.max || '';
        });
    }
    
    // Características físicas
    if (filters.physical) {
        const heightMin = document.getElementById('height-min');
        const heightMax = document.getElementById('height-max');
        const weightMin = document.getElementById('weight-min');
        const weightMax = document.getElementById('weight-max');
        const colorFilter = document.getElementById('color-filter');
        
        if (heightMin && filters.physical.height) heightMin.value = filters.physical.height.min || '';
        if (heightMax && filters.physical.height) heightMax.value = filters.physical.height.max || '';
        if (weightMin && filters.physical.weight) weightMin.value = filters.physical.weight.min || '';
        if (weightMax && filters.physical.weight) weightMax.value = filters.physical.weight.max || '';
        if (colorFilter) colorFilter.value = filters.physical.color || '';
    }
    
    // Generaciones y regiones
    const generationFilter = document.getElementById('generation-filter');
    const regionFilter = document.getElementById('region-filter-advanced');
    
    if (generationFilter && filters.generations) {
        Array.from(generationFilter.options).forEach(option => {
            option.selected = filters.generations.includes(option.value);
        });
    }
    
    if (regionFilter && filters.regions) {
        Array.from(regionFilter.options).forEach(option => {
            option.selected = filters.regions.includes(option.value);
        });
    }
    
    // Habilidades y movimientos
    const abilityFilter = document.getElementById('ability-filter');
    const moveFilter = document.getElementById('move-filter');
    const moveTypeFilter = document.getElementById('move-type-filter');
    
    if (abilityFilter) abilityFilter.value = filters.ability || '';
    if (moveFilter) moveFilter.value = filters.move || '';
    if (moveTypeFilter) moveTypeFilter.value = filters.moveType || '';
}

// Guardar búsqueda
function saveSearch() {
    const searchName = prompt('Nombre para esta búsqueda guardada:');
    if (!searchName) return;
    
    const searchEntry = {
        name: searchName,
        filters: JSON.parse(JSON.stringify(advancedSearchState.filters)),
        resultsCount: document.getElementById('advanced-results-count').textContent,
        timestamp: Date.now()
    };
    
    advancedSearchState.savedSearches.push(searchEntry);
    saveSearchesToStorage();
    playSound(selectSound);
    
    alert(`Búsqueda "${searchName}" guardada correctamente`);
}

// Mostrar búsquedas guardadas
function showSavedSearches() {
    if (advancedSearchState.savedSearches.length === 0) {
        alert('No tienes búsquedas guardadas');
        return;
    }
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.8); display: flex; justify-content: center;
        align-items: center; z-index: 10004;
    `;
    
    modal.innerHTML = `
        <div style="background: var(--modal-bg); padding: 20px; border-radius: 15px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;">
            <h3 style="color: var(--text-color); margin-bottom: 15px; text-align: center;">Búsquedas Guardadas</h3>
            <div class="saved-searches-list">
                ${advancedSearchState.savedSearches.map((search, index) => `
                    <div class="saved-search-item">
                        <div class="saved-search-info">
                            <div class="saved-search-name">${search.name}</div>
                            <div class="saved-search-details">
                                <span>${search.resultsCount} Pokémon</span>
                                <span style="font-size: 10px; color: var(--pokedex-gray);">
                                    ${new Date(search.timestamp).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                        <div class="saved-search-actions">
                            <button class="pokedex-button small" onclick="loadSavedSearch(${index})">Cargar</button>
                            <button class="pokedex-button small secondary" onclick="deleteSavedSearch(${index})">Eliminar</button>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div style="text-align: center; margin-top: 15px;">
                <button class="pokedex-button secondary" onclick="this.parentElement.parentElement.remove()">Cancelar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// Cargar búsqueda guardada
function loadSavedSearch(index) {
    const search = advancedSearchState.savedSearches[index];
    if (search) {
        advancedSearchState.filters = JSON.parse(JSON.stringify(search.filters));
        applyFiltersToUI(advancedSearchState.filters);
        applyAdvancedSearch();
        playSound(selectSound);
        document.querySelector('div[style*="z-index: 10004"]')?.remove();
    }
}

// Eliminar búsqueda guardada
function deleteSavedSearch(index) {
    if (confirm('¿Estás seguro de que quieres eliminar esta búsqueda guardada?')) {
        advancedSearchState.savedSearches.splice(index, 1);
        saveSearchesToStorage();
        showSavedSearches();
        playSound(clickSound);
    }
}

// Restablecer búsqueda avanzada
function resetAdvancedSearch() {
    if (confirm('¿Estás seguro de que quieres restablecer todos los filtros?')) {
        advancedSearchState.filters = {
            types: [],
            typeRelationship: 'any',
            stats: {},
            physical: {},
            generations: [],
            regions: [],
            ability: '',
            move: '',
            moveType: ''
        };
        
        // Restablecer UI
        document.querySelectorAll('#advanced-type-filters .advanced-type-filter.active').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.getElementById('type-relationship').value = 'any';
        
        // Limpiar inputs de stats
        const stats = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed', 'total'];
        stats.forEach(stat => {
            const minInput = document.getElementById(`stat-${stat}-min`);
            const maxInput = document.getElementById(`stat-${stat}-max`);
            if (minInput) minInput.value = '';
            if (maxInput) maxInput.value = '';
        });
        
        // Limpiar características físicas
        document.getElementById('height-min').value = '';
        document.getElementById('height-max').value = '';
        document.getElementById('weight-min').value = '';
        document.getElementById('weight-max').value = '';
        document.getElementById('color-filter').value = '';
        
        // Limpiar generaciones y regiones
        document.getElementById('generation-filter').selectedIndex = -1;
        document.getElementById('region-filter-advanced').selectedIndex = -1;
        
        // Limpiar habilidades y movimientos
        document.getElementById('ability-filter').value = '';
        document.getElementById('move-filter').value = '';
        document.getElementById('move-type-filter').value = '';
        
        applyAdvancedSearch();
        playSound(clickSound);
    }
}

// Cargar búsquedas guardadas
function loadSavedSearches() {
    try {
        const stored = localStorage.getItem('pokedex-saved-searches');
        if (stored) {
            advancedSearchState.savedSearches = JSON.parse(stored);
        }
    } catch (error) {
        advancedSearchState.savedSearches = [];
    }
}

// Guardar búsquedas
function saveSearchesToStorage() {
    try {
        localStorage.setItem('pokedex-saved-searches', JSON.stringify(advancedSearchState.savedSearches));
    } catch (error) {
        console.error('Error guardando búsquedas:', error);
    }
}

// Cargar historial de búsquedas
function loadSearchHistory() {
    try {
        const stored = localStorage.getItem('pokedex-search-history');
        if (stored) {
            advancedSearchState.searchHistory = JSON.parse(stored);
        }
    } catch (error) {
        advancedSearchState.searchHistory = [];
    }
}

// Guardar historial de búsquedas
function saveSearchHistory() {
    try {
        localStorage.setItem('pokedex-search-history', JSON.stringify(advancedSearchState.searchHistory));
    } catch (error) {
        console.error('Error guardando historial de búsquedas:', error);
    }
}


// Configurar validadores de formularios
function setupFormValidators() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const validation = FormValidator.validateLoginForm();
            const errorDiv = document.getElementById('login-error');
            
            if (!validation.valid) {
                if (errorDiv) {
                    errorDiv.textContent = validation.error;
                    errorDiv.style.display = 'block';
                }
                return;
            }
            
            if (errorDiv) errorDiv.style.display = 'none';
            loginForm.dispatchEvent(new Event('validated-submit'));
        });
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const validation = FormValidator.validateRegisterForm();
            const errorDiv = document.getElementById('register-error');
            
            if (!validation.valid) {
                if (errorDiv) {
                    errorDiv.textContent = validation.error;
                    errorDiv.style.display = 'block';
                }
                return;
            }
            
            if (errorDiv) errorDiv.style.display = 'none';
            registerForm.dispatchEvent(new Event('validated-submit'));
        });
    }
}

function setupModalCloseButtons() {
    const closeButtons = document.querySelectorAll('.close-button, .pokemon-3d-close');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = btn.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
                
                if (modal.id === 'pokemon-3d-modal') {
                    const viewer = document.getElementById('pokemon-3d-viewer');
                    if (viewer) viewer.src = '';
                }
            }
        });
    });
    
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal') && e.target.style.display === 'flex') {
            e.target.style.display = 'none';
            
            if (e.target.id === 'pokemon-3d-modal') {
                const viewer = document.getElementById('pokemon-3d-viewer');
                if (viewer) viewer.src = '';
            }
        }
    });
}

// ===== INICIALIZACIÓN =====
async function init() {
    initializeFromStorage();
    ensureFloatingButtonsVisible();
    
    setupFormValidators();
    setupAuth();
    setupSearch();
    setupNavigation();
    setupTabs();
    setupThemeToggle();
    setupSoundToggle();
    initializeVolumeControl();
    setupShinyToggle();
    setupSpriteToggle();
    setupTypeChartSystem();
    setupTeamSystem();
    setupFilterSections();
    setupHeaderLogo();
    
    // Configurar el nuevo botón de comparación general
    setupComparisonButton();
    setupComparisonModal(); // Para cerrar el modal
    
    loadComparisonFromStorage();
    setupMultipleComparison();
    
    setupQuizSystem();
    setupAdvancedSearch();

    // Event listeners actualizados
    document.getElementById('random-pokemon')?.addEventListener('click', showRandomPokemon);
    document.getElementById('history-button')?.addEventListener('click', showHistoryModal);
    document.getElementById('clear-comparison')?.addEventListener('click', clearComparisonGroup); // Corregido
    document.getElementById('clear-history')?.addEventListener('click', clearHistory);
    document.getElementById('favorites-only')?.addEventListener('click', filterFavorites); // Corregido
    
    setupModalCloseButtons();
    
    await fetchPokemonData();
}

// Inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', init); 