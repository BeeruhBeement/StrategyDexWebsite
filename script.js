// Utility: toID function for consistent ID conversion
function toID(text) {
    return ('' + text).toLowerCase().replace(/[^a-z0-9]+/g, '');
}

// Chaos mod data promise (for override data)
const chaosDataPromise = fetch('https://play.pokeathlon.com/data/teambuilder-tables.json')
    .then(r => r.json())
    .catch(() => null);

// Fetch Pokémon details from Showdown
async function fetchPokemonDetails(pokemonName) {
    try {
        const response = await fetch('https://play.pokeathlon.com/data/pokedex.json');
        if (!response.ok) {
            console.error('Failed to fetch Pokémon details from Pokémon Showdown.');
            return null;
        }
        const data = await response.json();
        const pokemonData = data[toID(pokemonName)];
        let spriteUrl = getSpriteURL(pokemonData); // use from utils.js
        pokemonData.spriteUrl = spriteUrl;
        return pokemonData;
    } catch (error) {
        console.error(`Error fetching details for ${pokemonName}`, error);
        return null;
    }
}

// Fetch Pokémon list from Showdown
async function fetchPokemonList() {
    try {
        const response = await fetch('https://play.pokeathlon.com/data/pokedex.json');
        if (!response.ok) {
            console.error('Failed to fetch Pokémon list from Pokémon Showdown.');
            return;
        }
        const data = await response.json();
        pokemonRawData = data; // Save for filtering
        pokemonList = Object.keys(data).map(pokemon => pokemon.toLowerCase());
    } catch (error) {
        console.error('Error fetching Pokémon list:', error);
    }
}

let pokemonRawData = {};
let pokemonList = [];
let showAllMode = false;

document.addEventListener('DOMContentLoaded', async function () {
    await fetchPokemonList();

    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    let typeSelect;

    if (searchInput) {
        searchInput.disabled = false;
        searchInput.placeholder = 'Search Pokémon...';
    }

    let currentPage = 1;
    let lastResults = [];
    let lastShowAll = false;
    let debounceTimer;

    async function displaySearchResults(results, isShowAll = false) {
        lastResults = results;
        lastShowAll = isShowAll;
        showAllMode = isShowAll;
        const pageSize = 28;
        const totalPages = Math.ceil(results.length / pageSize) || 1;
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;
        const startIdx = (currentPage - 1) * pageSize;
        const endIdx = startIdx + pageSize;
        const pageResults = results.slice(startIdx, endIdx);

        let html = '<div class="poke-grid">';
        for (const result of pageResults) {
            const pokemonName = result.item;
            let pokemonData = await fetchPokemonDetails(pokemonName);
            let chaosData = await chaosDataPromise;
            let overrideSpecies = getChaosOverrideData(pokemonName, chaosData);
            if (overrideSpecies) {
                pokemonData = Object.assign({}, pokemonData, overrideSpecies);
            }
            if (!pokemonData) continue;
            const types = pokemonData.types || ['normal'];
            const type1 = toID(types[0] || 'normal');
            const type2 = toID(types[1] || types[0] || 'normal');
            const color1 = window.TYPE_COLORS[type1] || window.TYPE_COLORS['normal'];
            const color2 = window.TYPE_COLORS[type2] || window.TYPE_COLORS['normal'];
            let tier = '';
            if (chaosData && chaosData.gen9chaos) {
                if (chaosData.gen9chaos.overrideTier && chaosData.gen9chaos.overrideTier[toID(pokemonName)]) {
                    tier = chaosData.gen9chaos.overrideTier[toID(pokemonName)];
                } else if (chaosData.gen9chaos.tiers && chaosData.gen9chaos.tiers[toID(pokemonName)]) {
                    tier = chaosData.gen9chaos.tiers[toID(pokemonName)];
                }
            }
            let spriteUrl = getSpriteURL(pokemonData);
            const fangameAttr = ` data-fangame="${pokemonData.fangame ? pokemonData.fangame : ''}"`;
            html += `<a class="poke-box" href="analysis.html?pokemon=${pokemonData.name.toLowerCase()}" tabindex="0" style="background:${color1.bg};color:${color1.fg};border:3px solid ${color2.bg};text-decoration:none;">
                <div class="poke-name">${capitalize(pokemonData.name)}</div>
                <div class="poke-tier">${tier || ''}</div>
                <img src="${spriteUrl}" alt="${pokemonData.name}" class="pokemon-sprite"${fangameAttr}>
            </a>`;
        }
        html += '</div>';
        if (totalPages > 1) {
            html += '<div class="pagination-controls" style="text-align:center;margin:16px 0;display:flex;align-items:center;justify-content:center;gap:10px;">';
            html += `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} data-page="prev">&lt; Prev</button>`;
            html += ` <span style="margin:0 8px;">Page </span>`;
            html += `<input id="pageInput" type="number" min="1" max="${totalPages}" value="${currentPage}" style="width:48px;padding:2px 6px;border-radius:6px;border:1.5px solid #bbb;font-size:1em;text-align:center;">`;
            html += `<span style="margin:0 8px;">of ${totalPages}</span> `;
            html += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} data-page="next">Next &gt;</button>`;
            html += '</div>';
        }
        searchResults.innerHTML = html;
        const pageInput = document.getElementById('pageInput');
        if (pageInput) {
            pageInput.addEventListener('change', function() {
                let val = parseInt(pageInput.value, 10);
                if (isNaN(val) || val < 1) val = 1;
                if (val > totalPages) val = totalPages;
                currentPage = val;
                displaySearchResults(lastResults, lastShowAll);
            });
        }
    }

    searchResults.addEventListener('click', function (event) {
        const pageBtn = event.target.closest('.page-btn');
        if (pageBtn) {
            const totalPages = Math.ceil(lastResults.length / 28) || 1;
            if (pageBtn.dataset.page === 'prev') {
                if (currentPage > 1) {
                    currentPage -= 1;
                    setTimeout(() => displaySearchResults(lastResults, lastShowAll), 0);
                }
            } else if (pageBtn.dataset.page === 'next') {
                if (currentPage < totalPages) {
                    currentPage += 1;
                    setTimeout(() => displaySearchResults(lastResults, lastShowAll), 0);
                }
            }
        }
    });

    searchResults.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
            const box = event.target.closest('.poke-box');
            if (box) {
                const clickedPokemonName = box.dataset.pokemon;
                redirectToAnalysis(clickedPokemonName);
            }
        }
    });

    const style = document.createElement('style');
    style.textContent = `
    .poke-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 18px;
        margin: 0 auto 0px auto;
        max-width: 65%;
        justify-items: center;
    }
    .poke-box {
        border-radius: 14px;
        box-shadow: 0 2px 8px #0002;
        padding: 12px 6px 10px 6px;
        min-width: 140px;
        min-height: 140px;
        max-width: 140px;
        max-height: 140px;
        width: 140px;
        height: 140px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        cursor: pointer;
        transition: transform 0.12s, box-shadow 0.12s;
        outline: none;
    }
    .poke-box:focus, .poke-box:hover {
        transform: scale(1.06);
        box-shadow: 0 4px 16px #0004;
        z-index: 2;
    }
    .poke-name, .poke-tier {
        word-break: break-word;
        text-shadow: 0 1px 2px #000a;
        font-size: 1em;
        text-align: center;
        margin: 0;
        padding: 0;
    }
    .poke-name {
        font-weight: bold;
        margin-bottom: 2px;
    }
    .poke-tier {
        font-size: 0.95em;
        opacity: 0.85;
        margin-bottom: 4px;
    }
    .pokemon-sprite {
        width: 96px !important;
        height: 96px !important;
        display: block;
        margin: 0 auto;
    }
    .pagination-controls button[disabled] {
        opacity: 0.5;
        cursor: not-allowed;
    }
    .filter-container {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 16px;
        margin-bottom: 18px;
        width: 100%;
    }
    #typeSelect {
        min-width: 90px;
        font-family: inherit;
        margin: 0 0 0 4px;
        padding: 4px 10px;
        border-radius: 8px;
        border: 1.5px solid #bbb;
        background: #f8f8fa;
        box-shadow: 0 1px 4px #0001;
        transition: border 0.15s;
    }
    #typeSelect:focus {
        border: 1.5px solid #888;
    }
    .filter-container label {
        font-weight: bold;
        font-size: 1em;
        color: #222;
        margin-left: 8px;
    }
    `;
    document.head.appendChild(style);

    function handleSearchInput() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const searchTerm = searchInput.value.trim().toLowerCase();
            const selectedType = typeSelect.value;
            showAllMode = false;
            let results = [];
            if (/^[a-z-]+$/.test(searchTerm)) {
                results = performSearch(searchTerm, selectedType);
            } else {
                results = pokemonList.filter(isValidDexEntry).map(name => ({ item: name }));
            }
            currentPage = 1;
            displaySearchResults(results);
        }, 300);
    }

    const searchWrapper = searchInput.parentNode;
    const filterContainer = document.createElement('div');
    filterContainer.className = 'filter-container';
    filterContainer.style.display = 'flex';
    filterContainer.style.alignItems = 'center';
    filterContainer.style.justifyContent = 'center';
    filterContainer.style.gap = '16px';
    filterContainer.style.marginBottom = '18px';
    searchInput.style.margin = '0 0 0 0';
    filterContainer.appendChild(searchInput);
    const typeLabel = document.createElement('label');

    //Typesearch (eg Water)
    typeLabel.textContent = 'Type:';
    typeLabel.setAttribute('for', 'typeSelect');
    typeLabel.style.marginLeft = '8px';
    typeLabel.style.fontWeight = 'bold';
    typeLabel.style.fontSize = '1em';
    typeLabel.style.color = '#fff';
    filterContainer.appendChild(typeLabel);
    typeSelect = document.createElement('select');
    typeSelect.id = 'typeSelect';
    typeSelect.style.margin = '0 0 0 4px';
    typeSelect.style.padding = '4px 10px';
    typeSelect.style.borderRadius = '8px';
    typeSelect.style.border = '1.5px solid #bbb';
    typeSelect.style.background = '#f8f8fa';
    typeSelect.style.fontSize = '1em';
    typeSelect.style.color = '#222';
    typeSelect.style.boxShadow = '0 1px 4px #0001';
    typeSelect.style.transition = 'border 0.15s';
    typeSelect.onfocus = () => typeSelect.style.border = '1.5px solid #888';
    typeSelect.onblur = () => typeSelect.style.border = '1.5px solid #bbb';
    filterContainer.appendChild(typeSelect);
    if (searchWrapper) {
        searchWrapper.insertBefore(filterContainer, searchWrapper.firstChild);
    }
    if (typeSelect && typeSelect.options.length === 0) {
        const typeList = [
            'all', 'normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground',
            'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
            '???', 'cosmic', 'crystal', 'nuclear'
        ];
        typeList.forEach(type => {
            const opt = document.createElement('option');
            opt.value = type;
            opt.textContent = type.charAt(0).toUpperCase() + type.slice(1);
            typeSelect.appendChild(opt);
        });
    }
    if (!window.TYPE_COLORS) window.TYPE_COLORS = {};
    
    // Fangame
    const fangameLabel = document.createElement('label');
    fangameLabel.textContent = 'Fangame:';
    fangameLabel.setAttribute('for', 'fangameSelect');
    fangameLabel.style.marginLeft = '8px';
    fangameLabel.style.fontWeight = 'bold';
    fangameLabel.style.fontSize = '1em';
    fangameLabel.style.color = '#fff';
    filterContainer.appendChild(fangameLabel);
    const fangameSelect = document.createElement('select');
    fangameSelect.id = 'fangameSelect';
    fangameSelect.style.margin = '0 0 0 4px';
    fangameSelect.style.padding = '4px 10px';
    fangameSelect.style.borderRadius = '8px';
    fangameSelect.style.border = '1.5px solid #bbb';
    fangameSelect.style.background = '#f8f8fa';
    fangameSelect.style.fontSize = '1em';
    fangameSelect.style.color = '#222';
    fangameSelect.style.boxShadow = '0 1px 4px #0001';
    fangameSelect.style.transition = 'border 0.15s';
    fangameSelect.onfocus = () => fangameSelect.style.border = '1.5px solid #888';
    fangameSelect.onblur = () => fangameSelect.style.border = '1.5px solid #bbb';
    filterContainer.appendChild(fangameSelect);
    if (fangameSelect && fangameSelect.options.length === 0) {
        const fangameList = [
            'all', 'insurgence', 'uranium', 'infinity', 'mariomon', 'pokeathlon', 'infinitefusion'
        ];
        fangameList.forEach(type => {
            const opt = document.createElement('option');
            opt.value = type;
            opt.textContent = type.charAt(0).toUpperCase() + type.slice(1);
            fangameSelect.appendChild(opt);
        });
    }
    fangameSelect.addEventListener('change', function() {
        const searchTerm = searchInput.value.trim().toLowerCase();
        let results = [];
        if (searchTerm.length >= 2 && /^[a-z-]+$/.test(searchTerm)) {
            results = performSearch(searchTerm, typeSelect.value, fangameSelect.value);
        } else if (searchTerm === '') {
            results = pokemonList.filter(isValidDexEntry).map(name => ({ item: name }));
            if (fangameSelect.value !== 'all') {
                results = performSearch('', typeSelect.value, fangameSelect.value);
            }
        }
        currentPage = 1;
        displaySearchResults(results);
    });

    displaySearchResults(pokemonList.filter(isValidDexEntry).map(name => ({ item: name })), false);

    function performSearch(term = '', selectedType = null, selectedFangame = null) {
        if (!selectedType) selectedType = document.getElementById('typeSelect')?.value || 'all';
        if (!selectedFangame) selectedFangame = document.getElementById('fangameSelect')?.value || 'all';
        let filtered = pokemonList.filter(isValidDexEntry);
        if (term) {
            filtered = filtered.filter(name => name.startsWith(term));
        }
        if (selectedType && selectedType !== 'all') {
            filtered = filtered.filter(name => {
                if (!window._pokeTypeCache) window._pokeTypeCache = {};
                if (!window._pokeTypeCache[name]) {
                    return false;
                }
                const types = window._pokeTypeCache[name];
                return types.includes(selectedType);
            });
        }
        if (selectedFangame && selectedFangame !== 'all') {
            const fangameValue = selectedFangame.toLowerCase();
            filtered = filtered.filter(name => {
                if (!window._pokeGameCache) window._pokeGameCache = {};
                if (!window._pokeGameCache[name]) {
                    return false;
                }
                // Cache is always array of lowercased strings
                const fangames = Array.isArray(window._pokeGameCache[name]) ? window._pokeGameCache[name] : [String(window._pokeGameCache[name])];
                return fangames.includes(fangameValue);
            });
        }
        return filtered.map(name => ({ item: name }));
    }

    typeSelect.addEventListener('change', function() {
        const searchTerm = searchInput.value.trim().toLowerCase();
        let results = [];
        if (searchTerm.length >= 2 && /^[a-z-]+$/.test(searchTerm)) {
            results = performSearch(searchTerm, typeSelect.value);
        } else if (searchTerm === '') {
            results = pokemonList.filter(isValidDexEntry).map(name => ({ item: name }));
            if (typeSelect.value !== 'all') {
                results = performSearch('', typeSelect.value);
            }
        }
        currentPage = 1;
        displaySearchResults(results);
    });

    searchInput.addEventListener('input', handleSearchInput);

    (async function cacheAllTypes() {
        if (!window._pokeTypeCache) window._pokeTypeCache = {};
        for (const name of pokemonList) {
            if (!window._pokeTypeCache[name]) {
                const data = await fetchPokemonDetails(name);
                window._pokeTypeCache[name] = (data && data.types) ? data.types.map(t => t.toLowerCase()) : ['normal'];
            }
        }
    })();
    
    (async function cacheAllFangames() {
        if (!window._pokeGameCache) window._pokeGameCache = {};
        for (const name of pokemonList) {
            if (!window._pokeGameCache[name]) {
                const data = await fetchPokemonDetails(name);
                let fangameList = ['insurgence', 'uranium', 'infinity', 'mariomon', 'pokeathlon', 'infinitefusion'];
                let fangames = [];
                if (data) {
                    const spriteUrl = getSpriteURL(data).toLowerCase();
                    const fangamePathMatch = spriteUrl.match(/fangame-sprites\/([^/]+)/);
                    if (fangamePathMatch && fangameList.includes(fangamePathMatch[1])) {
                        fangames.push(fangamePathMatch[1]);
                    }
                }
                if (fangames.length > 0) {
                    window._pokeGameCache[name] = fangames;
                } else {
                    window._pokeGameCache[name] = ['all'];
                }
            }
        }
    })();

    function getChaosOverrideData(name, chaosData) {
        if (!chaosData || !chaosData.gen9chaos) return null;
        const { overrideSpeciesData } = chaosData.gen9chaos;
        if (!overrideSpeciesData) return null;
        let override = overrideSpeciesData[toID(name)];
        if (!override && name.includes('-')) {
            const parts = name.split('-');
            for (let i = parts.length - 1; i > 0; i--) {
                const partialName = parts.slice(0, i).join('-');
                if (overrideSpeciesData[toID(partialName)]) {
                    override = overrideSpeciesData[toID(partialName)];
                    break;
                }
            }
        }
        return override || null;
    }

    fetch('https://play.pokeathlon.com/data/abilities.json')
        .then(r => r.json())
        .then(data => { abilitiesJson = data; });
});

function isValidDexEntry(name) {
    const poke = pokemonRawData[toID(name)];
    if (!poke) return false;
    if (poke.name && poke.name.toLowerCase().startsWith('pokestar')) return false;
    if (poke.requiredItem || poke.requiredAbility || poke.requiredMove || poke.battleOnly) return false;
    const n = name.toLowerCase();
    if (n.includes('gmax') || n.includes('totem')) return false;
    return true;
}
