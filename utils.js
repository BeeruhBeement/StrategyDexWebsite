// Utility: convert string to ID
function toID(text) {
    return text ? text.toLowerCase().replace(/[^a-z0-9]+/g, '') : '';
}

// Utility: capitalize each word
function capitalize(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/(^|[\s\-_])([a-zA-Z])/g, (m, sep, char) => sep + char.toUpperCase());
}

// Utility: get sprite URL for a Pokémon entry (just pngs, no ani/gif)
// type: boolean (false = front, true = back), shiny: boolean
function getSpriteURL(entry, type = false, shiny = false) {
    if (!entry) return '';
    let spriteType = type ? 'back' : 'front';
    if (shiny) spriteType = `${spriteType}-shiny`;
    for (const fangame of ['Insurgence', 'Uranium', 'Infinity', 'Mariomon', 'Pokeathlon', 'Infinite Fusion']) {
        if (entry.tags && entry.tags.includes(fangame)) {
            return 'https://play.pokeathlon.com/sprites/fangame-sprites/' + toID(fangame) + (fangame === 'Infinite Fusion' ? '' : '/' + spriteType) + '/' + toID(entry.name) + ((fangame === 'Pokeathlon' || fangame === 'Uranium') ? '.gif' : '.png');
        }
    }
    if (entry.baseSpecies && entry.forme) {
        if (type) {
            if (shiny) return 'https://play.pokemonshowdown.com/sprites/gen5-back-shiny/' + toID(entry.baseSpecies) + '-' + toID(entry.forme) + '.png';
            else return 'https://play.pokemonshowdown.com/sprites/gen5-back/' + toID(entry.baseSpecies) + '-' + toID(entry.forme) + '.png';
        }
        if (shiny) return 'https://play.pokemonshowdown.com/sprites/gen5-shiny/' + toID(entry.baseSpecies) + '-' + toID(entry.forme) + '.png';
        else return 'https://play.pokemonshowdown.com/sprites/gen5/' + toID(entry.baseSpecies) + '-' + toID(entry.forme) + '.png';
    }
    if (type) {
        if (shiny) return 'https://play.pokemonshowdown.com/sprites/gen5-back-shiny/' + toID(entry.name) + '.png';
        return 'https://play.pokemonshowdown.com/sprites/gen5-back/' + toID(entry.name) + '.png';
    }
    if (shiny) return 'https://play.pokemonshowdown.com/sprites/gen5-shiny/' + toID(entry.name) + '.png';
    return 'https://play.pokemonshowdown.com/sprites/gen5/' + toID(entry.name) + '.png';
}

// Utility: get stat color for stat bar
function getStatColor(stat) {
    if (stat <= 100) {
        const g = Math.floor((stat / 100) * 255);
        return `rgb(255, ${g}, 0)`; // red to green
    } else if (stat <= 200) {
        const b = Math.floor(((stat - 100) / 100) * 255);
        return `rgb(${255 - b}, 255, ${b})`; // green to light blue
    } else {
        const purple = Math.min(255, Math.floor(((stat - 200) / 55) * 255));
        return `rgb(${200 - purple / 3}, ${100 - purple / 2}, ${200})`; // light blue to purple
    }
}

// Utility: show tooltip
function showTooltip(content, x, y) {
    let tooltip = document.getElementById('tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'tooltip';
        tooltip.style.position = 'absolute';
        tooltip.style.zIndex = 1000;
        tooltip.style.background = '#222';
        tooltip.style.color = '#fff';
        tooltip.style.padding = '8px 12px';
        tooltip.style.borderRadius = '8px';
        tooltip.style.fontSize = '14px';
        tooltip.style.display = 'none';
        tooltip.style.pointerEvents = 'none';
        document.body.appendChild(tooltip);
    }
    tooltip.innerHTML = content;
    tooltip.style.left = x + 10 + 'px';
    tooltip.style.top = y + 10 + 'px';
    tooltip.style.display = 'block';
}
function hideTooltip() {
    const tooltip = document.getElementById('tooltip');
    if (tooltip) tooltip.style.display = 'none';
}

// Type color mapping for backgrounds and outlines
window.TYPE_COLORS = {
    normal:   { bg: '#A8A77A', fg: '#222' },
    fire:     { bg: '#EE8130', fg: '#fff' },
    water:    { bg: '#6390F0', fg: '#fff' },
    electric: { bg: '#F7D02C', fg: '#222' },
    grass:    { bg: '#7AC74C', fg: '#222' },
    ice:      { bg: '#96D9D6', fg: '#222' },
    fighting: { bg: '#C22E28', fg: '#fff' },
    poison:   { bg: '#A33EA1', fg: '#fff' },
    ground:   { bg: '#E2BF65', fg: '#222' },
    flying:   { bg: '#A98FF3', fg: '#222' },
    psychic:  { bg: '#F95587', fg: '#fff' },
    bug:      { bg: '#A6B91A', fg: '#222' },
    rock:     { bg: '#B6A136', fg: '#222' },
    ghost:    { bg: '#735797', fg: '#fff' },
    dragon:   { bg: '#6F35FC', fg: '#fff' },
    dark:     { bg: '#705746', fg: '#fff' },
    steel:    { bg: '#B7B7CE', fg: '#222' },
    fairy:    { bg: '#D685AD', fg: '#222' },
    '???':    { bg: '#629683', fg: '#fff' },
    cosmic:   { bg: '#6e3fd6', fg: '#fff' },
    crystal:  { bg: '#7ee6e6', fg: '#222' },
    nuclear:  { bg: '#5bff3b', fg: '#222' }
};
