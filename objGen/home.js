    const words = ['Woman', 'Fire', 'Office Chair', 'Big Mac', 'Vintage Radio', 'Tissue Box', 'Breasts', 'Water Bottle', 'Tower', 'Toes', 'Pillow', 'Backpack', 'The Essence of Joy'];
    const rand = (min, max) => Math.floor(Math.random() * (max - min) + min);
    const gen = () => document.getElementById('txt').innerHTML = words[rand(0, words.length)];
