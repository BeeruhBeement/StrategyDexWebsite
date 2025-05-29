document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    const settingsButton = document.getElementById('settingsButton');
    const settingsMenu = document.getElementById('settingsMenu');
    const toggleDarkModeButton = document.getElementById('toggleDarkMode');
    
    document.getElementById('randomButton').addEventListener('click', showRandomPokemon);

    let pokemonList = [];
    let debounceTimer;

    async function fetchPokemonList() {
        try {
            const response = await fetch('https://play.pokeathlon.com/data/pokedex.json');
            if (!response.ok) {
                console.error('Failed to fetch Pokémon list from Pokémon Showdown.');
                return;
            }
            const data = await response.json();
            pokemonList = Object.keys(data).map(pokemon => pokemon.toLowerCase());
        } catch (error) {
            console.error('Error fetching Pokémon list:', error);
        }
    }

    async function fetchPokemonDetails(pokemonName) {
        try {
            const response = await fetch('https://play.pokeathlon.com/data/pokedex.json');
            if (!response.ok) {
                console.error('Failed to fetch Pokémon details from Pokémon Showdown.');
                return null;
            }
            const data = await response.json();
            const pokemonData = data[toID(pokemonName)];
    
            let spriteUrl = getSpriteURL(pokemonData);
            
            pokemonData.spriteUrl = spriteUrl;
            return pokemonData;
        } catch (error) {
            console.error(`Error fetching details for ${pokemonName}`, error);
            return null;
        }
    }    

    /*async function fetchTierData() {
        try {
            const response = await fetch('pokemonData.json');
            if (!response.ok) {
                console.error('Failed to fetch tier data.');
                return;
            }
            tierData = await response.json();
        } catch (error) {
            console.error('Error fetching tier data:', error);
        }
    }*/

    function handleSearchInput() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            const searchTerm = searchInput.value.trim().toLowerCase();
            const randomButton = document.getElementById('randomButton');
            const randomLabel = document.getElementById('randomLabel');

            if (searchTerm.length >= 2 && /^[a-z-]+$/.test(searchTerm)) {
                const results = performFuzzySearch(searchTerm);
                displaySearchResults(results);
                randomButton.style.display = 'none';
                randomLabel.style.display = 'none';
            } else if (searchTerm === '') {
                if (pokemonList.length > 0) {
                    const randomIndex = Math.floor(Math.random() * pokemonList.length);
                    const randomPokemonName = pokemonList[randomIndex];
                    const fakeFuseResults = [{ item: randomPokemonName }];
                    await displaySearchResults(fakeFuseResults);
                    randomButton.style.display = 'inline-block';
                    randomLabel.style.display = 'block';
                }
            } else {
                searchResults.innerHTML = '';
                randomButton.style.display = 'none';
                randomLabel.style.display = 'none';
            }
        }, 300);
    }

    function performFuzzySearch(term) {
        const fuse = new Fuse(pokemonList, { threshold: 0.4 });
        return fuse.search(term);
    }

    async function displaySearchResults(results) {
        let html = '';
        const uniqueResults = new Set();
    
        for (const result of results) {
            const pokemonName = result.item;
            if (uniqueResults.has(pokemonName)) continue;
            uniqueResults.add(pokemonName);
    
            let pokemonData = await fetchPokemonDetails(pokemonName);
    
            if (pokemonData) {
                const types = pokemonData.types ? pokemonData.types.map(type => capitalize(type)).join(' / ') : 'Unknown';
                let abilities = 'Unknown';
                if (pokemonData.abilities) {
                    const abilityArray = Object.values(pokemonData.abilities);
                    abilities = abilityArray.map(ability => capitalize(ability)).join(' / ');
                }
    
                // Set sprite URL based on generation
                let spriteUrl = getSpriteURL(pokemonData);
    
                const typeIconsHtml = pokemonData.types ? pokemonData.types.map(type => `<img src="https://play.pokeathlon.com/fx/types/${type}.png" alt="${capitalize(type)}" class="type-icon-small"></img>`).join(' ') : 'Unknown';
    
                html += `
                    <div class="pokemon" data-pokemon="${pokemonData.name.toLowerCase()}" data-types="${types}" data-abilities="${abilities}" data-stats='${JSON.stringify(pokemonData.baseStats)}'>
                        <h2 class="pokemon-name">${capitalize(pokemonData.name)}</h2>
                        <img src="${spriteUrl}" alt="${pokemonData.name}" class="pokemon-sprite">
                        <div class="pokemon-details">
                            <p>Typing: ${typeIconsHtml}</p>
                            <p>Abilities: ${abilities}</p>
                        </div>
                    </div>
                `;
            }
        }
        searchResults.innerHTML = html;
    }    

    function redirectToAnalysis(clickedPokemonName, spriteUrl) {
        const clickedPokemonElement = document.querySelector(`.pokemon[data-pokemon="${clickedPokemonName}"]`);
        const types = clickedPokemonElement.getAttribute('data-types');
        const abilities = clickedPokemonElement.getAttribute('data-abilities');
        const stats = clickedPokemonElement.getAttribute('data-stats');
    
        localStorage.setItem('pokemonTypes', types);
        localStorage.setItem('pokemonAbilities', abilities);
        localStorage.setItem('pokemonStats', stats);
        //localStorage.setItem('tierData', JSON.stringify(tierData));
        localStorage.setItem('pokemonSprite', spriteUrl); // Store the sprite URL
    
        window.location.href = `analysis.html?pokemon=${clickedPokemonName}`;
    }

    function toggleDarkMode() {
        document.body.classList.toggle('light-mode');
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDarkMode ? 'enabled' : 'disabled');
        toggleDarkModeButton.setAttribute('aria-pressed', isDarkMode);
    }

    settingsButton.addEventListener('click', function() {
        settingsMenu.classList.toggle('show-settings');
    });

    function capitalize(str) {
        if (typeof str !== 'string') {
            return '';
        }
        return str.replace(/\b\w/g, char => char.toUpperCase());
    }

    searchInput.addEventListener('input', handleSearchInput);

    searchResults.addEventListener('click', function(event) {
        const pokemonElement = event.target.closest('.pokemon');
        if (pokemonElement) {
            const clickedPokemonName = pokemonElement.dataset.pokemon;
            redirectToAnalysis(clickedPokemonName);
        }
    });

    toggleDarkModeButton.addEventListener('click', toggleDarkMode);

    //fetchTierData();
    fetchPokemonList().then(() => {
        showRandomPokemon();
    });


    const darkMode = localStorage.getItem('darkMode');
    if (darkMode === 'disabled') {
        document.body.classList.remove('dark-mode');
        document.body.classList.add('light-mode');
    }

    function getSpriteURL(entry) {
        for (const fangame of ['Insurgence', 'Uranium', 'Infinity', 'Infinite Fusion', 'Mariomon', 'Pokeathlon']) {
            if (entry.tags && entry.tags.includes(fangame)) {
                return 'https://play.pokeathlon.com/sprites/fangame-sprites/' + toID(fangame) + '/front/' + toID(entry.name) + (fangame === 'Pokeathlon' ? '.gif' : '.png');
            }
        }
        if (entry.baseSpecies && entry.forme) {
            return 'https://play.pokemonshowdown.com/sprites/gen5/' + toID(entry.baseSpecies) + '-' + toID(entry.forme) + '.png';
        }
        return 'https://play.pokemonshowdown.com/sprites/gen5/' + toID(entry.name) + '.png';
    }

    function toID(text) {
        return text.toLowerCase().replace(/[^a-z0-9]+/g, '');
    }

    async function showRandomPokemon() {
        if (pokemonList.length === 0) return;

        const randomIndex = Math.floor(Math.random() * pokemonList.length);
        const randomPokemonName = pokemonList[randomIndex];
        const fakeFuseResults = [{ item: randomPokemonName }];

        await displaySearchResults(fakeFuseResults);

        document.getElementById('randomButton').style.display = 'inline-block';
        document.getElementById('randomLabel').style.display = 'block';
    }
});
