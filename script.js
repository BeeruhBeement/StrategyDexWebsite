document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    const generationSelect = document.getElementById('generationSelect');
    const toggleDarkModeButton = document.getElementById('toggleDarkMode');
    let pokemonList = [];
    let debounceTimer;
    let tierData;

    async function generateGenerationOptions(selectElement) {
        const totalGenerations = 9;
        for (let i = 1; i <= totalGenerations; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `Generation ${i}`;
            selectElement.appendChild(option);
        }
    }

    async function fetchPokemonList() {
        try {
            const countResponse = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1');
            if (!countResponse.ok) {
                console.error('Failed to fetch Pokémon count.');
                return;
            }
            const countData = await countResponse.json();
            const totalPokemon = countData.count;
            const response = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${totalPokemon}`);
            if (!response.ok) {
                console.error('Failed to fetch Pokémon list.');
                return;
            }
            const data = await response.json();
            pokemonList = data.results.map(pokemon => pokemon.name);

            // Add base names for Silvally and Arceus
            pokemonList.push('silvally', 'arceus');

            // Manually add alternative forms for Silvally and Arceus
            const silvallyForms = ['bug', 'dark', 'dragon', 'electric', 'fairy', 'fighting', 'fire', 'flying', 'ghost', 'grass', 'ground', 'ice', 'poison', 'psychic', 'rock', 'steel', 'water'];
            const arceusForms = ['bug', 'dark', 'dragon', 'electric', 'fairy', 'fighting', 'fire', 'flying', 'ghost', 'grass', 'ground', 'ice', 'poison', 'psychic', 'rock', 'steel', 'water'];
            addPokemonForms('silvally', silvallyForms);
            addPokemonForms('arceus', arceusForms);
        } catch (error) {
            console.error('Error fetching Pokémon list:', error);
        }
    }

    function addPokemonForms(baseName, forms) {
        for (const form of forms) {
            const formName = `${baseName}-${form}`;
            pokemonList.push(formName.toLowerCase());
        }
    }

    async function fetchPokemonDetails(pokemonName) {
        try {
            let response;
            if (pokemonName.includes('-')) {
                // Fetch from the pokemon-form endpoint for alternative forms
                response = await fetch(`https://pokeapi.co/api/v2/pokemon-form/${pokemonName}`);
            } else {
                // Fetch from the pokemon endpoint for base forms
                response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonName}`);
            }

            if (!response.ok) {
                // Fallback to base form data if specific form data is not found
                const baseFormName = pokemonName.split('-')[0];
                response = await fetch(`https://pokeapi.co/api/v2/pokemon/${baseFormName}`);
                if (!response.ok) {
                    console.error(`Failed to fetch details for ${pokemonName} or its base form.`);
                    return null;
                }
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error(`Error fetching details for ${pokemonName}:`, error);
            return null;
        }
    }

    async function fetchTierData() {
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
    }

    function handleSearchInput() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            const searchTerm = searchInput.value.trim().toLowerCase();
            if (searchTerm.length >= 2 && /^[a-z-]+$/.test(searchTerm)) {
                const results = performFuzzySearch(searchTerm);
                displaySearchResults(results);
            } else {
                searchResults.innerHTML = '';
            }
        }, 300);
    }

    function performFuzzySearch(term) {
        const fuse = new Fuse(pokemonList, { threshold: 0.4 });
        return fuse.search(term);
    }

    async function displaySearchResults(results) {
        let html = '';
        const uniqueResults = new Set(); // Use a Set to store unique Pokémon names

        for (const result of results) {
            const pokemonName = result.item;
            if (uniqueResults.has(pokemonName)) continue; // Skip if already processed
            uniqueResults.add(pokemonName);

            let pokemonData = await fetchPokemonDetails(pokemonName);
            if (!pokemonData) {
                // Fallback to base form data if specific form data is not found
                const baseFormName = pokemonName.split('-')[0];
                pokemonData = await fetchPokemonDetails(baseFormName);
            }

            if (pokemonData) {
                const generation = generationSelect.value;
                const pokemonTier = tierData[`generation${generation}`][pokemonName]?.tier || 'other';
                const types = pokemonData.types ? pokemonData.types.map(type => capitalize(type.type.name)).join(' / ') : 'Unknown';
                const abilities = pokemonData.abilities ? pokemonData.abilities.map(ability => capitalize(ability.ability.name)).join(', ') : 'Unknown';
                html += `
                    <div class="pokemon" data-pokemon="${pokemonName}" data-types="${types}" data-abilities="${abilities}" data-stats='${JSON.stringify(pokemonData.stats)}'>
                        <h2>${capitalize(pokemonData.name)}</h2>
                        <img src="${pokemonData.sprites.front_default}" alt="${pokemonData.name}">
                        <p>Types: ${types}</p>
                        <p>Abilities: ${abilities}</p>
                        <p>Tier: ${capitalize(pokemonTier)}</p>
                    </div>
                `;
            }
        }
        searchResults.innerHTML = html;
    }

    function redirectToAnalysis(clickedPokemonName) {
        const selectedGeneration = generationSelect.value;
        const clickedPokemonElement = document.querySelector(`.pokemon[data-pokemon="${clickedPokemonName}"]`);
        const types = clickedPokemonElement.getAttribute('data-types');
        const abilities = clickedPokemonElement.getAttribute('data-abilities');
        const stats = clickedPokemonElement.getAttribute('data-stats');

        localStorage.setItem('selectedGeneration', selectedGeneration);
        localStorage.setItem('pokemonTypes', types);
        localStorage.setItem('pokemonAbilities', abilities);
        localStorage.setItem('pokemonStats', stats);

        window.location.href = `analysis.html?pokemon=${clickedPokemonName}&generation=${selectedGeneration}`;
    }

    function toggleDarkMode() {
        document.body.classList.toggle('light-mode');
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDarkMode ? 'enabled' : 'disabled');
        toggleDarkModeButton.setAttribute('aria-pressed', isDarkMode);
    }

    function capitalize(str) {
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

    fetchTierData();
    fetchPokemonList();
    generateGenerationOptions(generationSelect);

    const selectedGeneration = localStorage.getItem('selectedGeneration');
    if (selectedGeneration) {
        generationSelect.value = selectedGeneration;
    }

    const darkMode = localStorage.getItem('darkMode');
    if (darkMode === 'disabled') {
        document.body.classList.remove('dark-mode');
        document.body.classList.add('light-mode');
    }
});