
// Over 1000 words organized by categories for the Chameleon Undercover game

export type WordCategory = {
  name: string;
  emoji: string;
  words: string[];
};

export const categories: WordCategory[] = [
  {
    name: "Animals",
    emoji: "🐘",
    words: [
      "Elephant", "Tiger", "Penguin", "Giraffe", "Dolphin", "Kangaroo", "Panda",
      "Eagle", "Octopus", "Crocodile", "Butterfly", "Rhinoceros", "Wolf", "Gorilla",
      "Koala", "Flamingo", "Shark", "Zebra", "Peacock", "Sloth", "Hedgehog", "Squirrel",
      "Turtle", "Jaguar", "Raccoon", "Jellyfish", "Parrot", "Chameleon", "Owl", "Platypus",
      "Walrus", "Meerkat", "Lynx", "Narwhal", "Alpaca", "Bison", "Lemur", "Tarantula",
      "Armadillo", "Scorpion", "Badger", "Cheetah", "Beaver", "Ostrich", "Hyena",
      "Hippo", "Moose", "Bald Eagle", "Wolverine", "Hummingbird"
    ]
  },
  {
    name: "Occupations",
    emoji: "👨‍⚕️",
    words: [
      "Doctor", "Teacher", "Firefighter", "Architect", "Chef", "Pilot", "Actor",
      "Engineer", "Scientist", "Lawyer", "Journalist", "Programmer", "Astronaut",
      "Photographer", "Plumber", "Electrician", "Detective", "Veterinarian",
      "Carpenter", "Mechanic", "Paramedic", "Dentist", "Librarian", "Designer",
      "Athlete", "Musician", "Baker", "Barber", "Painter", "Police Officer",
      "Farmer", "Surgeon", "Judge", "Accountant", "Gardener", "Cashier", "Therapist",
      "Tour Guide", "Philosopher", "Security Guard", "Tailor", "Dancer", "Zoologist",
      "Bartender", "Lifeguard", "Fisherman", "Archeologist", "Translator", "Historian",
      "Receptionist"
    ]
  },
  {
    name: "Fictional Characters",
    emoji: "🦸‍♀️",
    words: [
      "Harry Potter", "Sherlock Holmes", "Wonder Woman", "Darth Vader", "Snow White",
      "Batman", "Frodo Baggins", "Superman", "Captain Jack Sparrow", "Elsa", "Pikachu",
      "Iron Man", "Alice in Wonderland", "Peter Pan", "James Bond", "Gandalf",
      "Black Panther", "Katniss Everdeen", "Winnie the Pooh", "Dracula", "Spider-Man",
      "Hermione Granger", "Luke Skywalker", "Captain America", "Cinderella", "Hulk",
      "Gollum", "Buzz Lightyear", "Mary Poppins", "The Joker", "Indiana Jones", "Thor",
      "Princess Leia", "Shrek", "Mulan", "Simba", "The Little Mermaid", "Dumbledore",
      "Jack Sparrow", "Dorothy Gale", "Doctor Strange", "Genie", "Voldemort",
      "Daenerys Targaryen", "Mickey Mouse", "Groot", "Aladdin", "Jon Snow", "Yoda", "Tinkerbell"
    ]
  },
  {
    name: "Travel Destinations",
    emoji: "🗼",
    words: [
      "Paris", "Tokyo", "New York", "Venice", "Machu Picchu", "Dubai", "Sydney",
      "Santorini", "Rome", "Bali", "London", "Kyoto", "Grand Canyon", "Barcelona",
      "Great Barrier Reef", "Iceland", "Amsterdam", "Cairo", "Hawaii", "Singapore",
      "Rio de Janeiro", "Petra", "Bora Bora", "Cape Town", "Marrakech", "Istanbul",
      "Bangkok", "Swiss Alps", "Hong Kong", "Prague", "Maldives", "Serengeti",
      "Angkor Wat", "Dublin", "Lake Como", "Vienna", "Fiji", "San Francisco", "Reykjavik",
      "Budapest", "Seville", "Yellowstone", "Queenstown", "Athens", "Berlin", "Vancouver",
      "Cancun", "Stockholm", "Victoria Falls", "Montreal"
    ]
  },
  {
    name: "Food & Drinks",
    emoji: "🍕",
    words: [
      "Pizza", "Sushi", "Espresso", "Burger", "Chocolate", "Smoothie", "Taco",
      "Croissant", "Curry", "Lemonade", "Lasagna", "Cappuccino", "Pancakes",
      "Ice Cream", "Steak", "Doughnut", "Mojito", "Pad Thai", "Cheesecake",
      "Pasta", "Milkshake", "Bubble Tea", "Guacamole", "Ramen", "Cupcake",
      "Margarita", "Macarons", "Tiramisu", "Dumpling", "Crepe", "Hot Dog",
      "Risotto", "Gelato", "Falafel", "Gazpacho", "Churros", "Ceviche",
      "Baklava", "Pho", "Tapas", "Paella", "Waffle", "Hummus", "Mochi",
      "Quiche", "Popcorn", "Kimchi", "Bruschetta", "Apple Pie", "Moussaka"
    ]
  },
  {
    name: "Technology",
    emoji: "💻",
    words: [
      "Smartphone", "Robot", "Virtual Reality", "Bluetooth", "Artificial Intelligence",
      "Drone", "Cloud Computing", "Blockchain", "Internet of Things", "Smart Watch",
      "3D Printer", "Augmented Reality", "Wireless Charging", "Biometrics",
      "Quantum Computing", "Solar Panel", "Encryption", "Machine Learning",
      "Hologram", "E-Reader", "Voice Assistant", "Cybersecurity", "Nanotechnology",
      "Self-Driving Car", "Wearable Tech", "Digital Wallet", "Smart Home",
      "Electric Vehicle", "Touch Screen", "Wireless Earbuds", "Face Recognition",
      "Data Mining", "Space Station", "Thermostat", "Streaming Service", "Video Conferencing",
      "Gesture Control", "Neural Network", "Digital Twin", "Big Data", "Edge Computing",
      "Smart Speaker", "Digital Currency", "Haptic Feedback", "Predictive Text",
      "Facial Recognition", "GPS Navigation", "Smart Grid", "5G Network", "Cryptocurrency"
    ]
  },
  {
    name: "Movies & TV Shows",
    emoji: "🎬",
    words: [
      "Inception", "Friends", "Star Wars", "Breaking Bad", "Titanic", "Game of Thrones",
      "The Matrix", "The Office", "Jurassic Park", "The Simpsons", "Avatar",
      "Stranger Things", "The Lion King", "Black Mirror", "Pulp Fiction",
      "The Crown", "Avengers", "Squid Game", "Forrest Gump", "The Mandalorian",
      "The Godfather", "The Queen's Gambit", "Finding Nemo", "The Witcher",
      "Back to the Future", "Bridgerton", "Fight Club", "This Is Us", "Frozen",
      "Westworld", "Shawshank Redemption", "WandaVision", "La La Land",
      "Dark", "Toy Story", "Money Heist", "Gladiator", "The Good Place",
      "The Dark Knight", "Ted Lasso", "The Lord of the Rings", "The Handmaid's Tale",
      "Up", "Ozark", "The Wizard of Oz", "Succession", "Interstellar", "Schitt's Creek",
      "Parasite", "The Big Bang Theory"
    ]
  },
  {
    name: "Sports",
    emoji: "⚽",
    words: [
      "Soccer", "Basketball", "Tennis", "Golf", "Swimming", "Baseball", "Cricket",
      "Volleyball", "Hockey", "Rugby", "Surfing", "Boxing", "Skiing", "Gymnastics",
      "Marathon", "Badminton", "Cycling", "Karate", "Archery", "Skateboarding",
      "Sumo Wrestling", "Figure Skating", "Fencing", "Rowing", "Bowling",
      "Diving", "Sailing", "Snowboarding", "Martial Arts", "Equestrian",
      "Polo", "Table Tennis", "Water Polo", "Curling", "Rock Climbing",
      "Handball", "Triathlon", "Biathlon", "Bobsleigh", "Ultimate Frisbee",
      "Parkour", "Billiards", "Lacrosse", "Darts", "BMX Racing", "Weightlifting",
      "Wrestling", "Canoeing", "Shot Put", "Javelin Throw"
    ]
  },
  {
    name: "Musical Instruments",
    emoji: "🎸",
    words: [
      "Guitar", "Piano", "Violin", "Drums", "Flute", "Saxophone", "Trumpet", "Harp",
      "Cello", "Clarinet", "Accordion", "Ukulele", "Harmonica", "Bagpipes", "Xylophone",
      "Bass Guitar", "Trombone", "Banjo", "Oboe", "Organ", "Mandolin", "French Horn",
      "Bongos", "Synthesizer", "Didgeridoo", "Tambourine", "Keytar", "Maracas",
      "Theremin", "Triangle", "Electric Guitar", "Grand Piano", "Kalimba", "Viola",
      "Bassoon", "Sitar", "Tuba", "Glockenspiel", "Steel Drums", "Zither",
      "Piccolo", "Djembe", "Lyre", "Panpipes", "Recorder", "Kazoo", "Erhu",
      "Balalaika", "Double Bass", "Ocarina"
    ]
  },
  {
    name: "Famous Landmarks",
    emoji: "🗽",
    words: [
      "Eiffel Tower", "Statue of Liberty", "Great Wall of China", "Taj Mahal", 
      "Colosseum", "Machu Picchu", "Pyramids of Giza", "Sydney Opera House", 
      "Stonehenge", "Mount Rushmore", "Big Ben", "Golden Gate Bridge", "Acropolis", 
      "Leaning Tower of Pisa", "Christ the Redeemer", "Angkor Wat", "Burj Khalifa", 
      "Mount Fuji", "Petra", "Grand Canyon", "Sagrada Familia", "Moai Statues", 
      "Chichen Itza", "Westminster Abbey", "Kremlin", "Brandenburg Gate", 
      "Forbidden City", "Neuschwanstein Castle", "Uluru", "Great Sphinx", 
      "Parthenon", "Notre Dame Cathedral", "Empire State Building", "Hagia Sophia", 
      "Buckingham Palace", "Mount Everest", "Louvre Museum", "Tower of London", 
      "Niagara Falls", "Sistine Chapel", "Matterhorn", "Terracotta Army", 
      "Victoria Falls", "Hollywood Sign", "Alhambra", "Guggenheim Museum", 
      "The Shard", "Vatican City", "Gateway Arch", "Alcatraz"
    ]
  },
  {
    name: "Video Games",
    emoji: "🎮",
    words: [
      "Minecraft", "Fortnite", "The Legend of Zelda", "Super Mario", "Call of Duty", 
      "Tetris", "Overwatch", "Pac-Man", "Grand Theft Auto", "World of Warcraft", 
      "Pokémon", "Final Fantasy", "Animal Crossing", "Assassin's Creed", "Halo", 
      "The Sims", "God of War", "Sonic the Hedgehog", "Among Us", "Red Dead Redemption", 
      "League of Legends", "Skyrim", "Resident Evil", "Portal", "Street Fighter", 
      "Cyberpunk 2077", "Fallout", "FIFA", "Metal Gear Solid", "Dark Souls", 
      "Mortal Kombat", "Mass Effect", "Destiny", "Uncharted", "Candy Crush", 
      "Doom", "Valorant", "BioShock", "The Witcher", "Roblox", "Genshin Impact", 
      "Counter-Strike", "Donkey Kong", "Persona", "StarCraft", "Civilization", 
      "Metroid", "Half-Life", "Monster Hunter", "Mario Kart"
    ]
  },
  {
    name: "Inventions",
    emoji: "💡",
    words: [
      "Wheel", "Light Bulb", "Telephone", "Internet", "Printing Press", "Compass", 
      "Antibiotics", "Steam Engine", "Microscope", "Airplane", "Computer", "Telescope", 
      "Camera", "Refrigerator", "Clock", "Gunpowder", "Electricity", "Radio", 
      "Television", "Automobile", "Penicillin", "X-Ray", "Satellite", "GPS", 
      "Microchip", "Glass", "Radar", "Battery", "Barcode", "Thermometer", 
      "Zipper", "Bicycle", "Laser", "Post-it Notes", "Spectacles", "Ballpoint Pen", 
      "Vacuum Cleaner", "Microwave Oven", "Elevator", "Calculator", "Contact Lens", 
      "Scissors", "Velcro", "Toilet Paper", "Toothbrush", "Match", "Safety Pin", 
      "Sewing Machine", "ATM", "Windmill"
    ]
  },
  {
    name: "Board Games",
    emoji: "🎲",
    words: [
      "Chess", "Monopoly", "Scrabble", "Risk", "Clue", "Battleship", "Catan", 
      "Checkers", "Trivial Pursuit", "Backgammon", "Connect Four", "Ticket to Ride", 
      "Uno", "Sorry!", "Pictionary", "Jenga", "Life", "Candy Land", "Pandemic", 
      "Yahtzee", "Operation", "Stratego", "Scattergories", "Boggle", "Othello", 
      "Mancala", "Mastermind", "Cranium", "Twister", "Diplomacy", "Mouse Trap", 
      "Blokus", "Guess Who?", "Sequence", "Cribbage", "Azul", "Go", "Trouble", 
      "Dominion", "Codenames", "Axis & Allies", "Reversi", "Taboo", "Mahjong", 
      "Chutes and Ladders", "Parcheesi", "Apples to Apples", "Munchkin", "Rummikub", 
      "Betrayal at House on the Hill"
    ]
  },
  {
    name: "Fantasy Creatures",
    emoji: "🐉",
    words: [
      "Dragon", "Unicorn", "Mermaid", "Phoenix", "Centaur", "Griffin", "Werewolf", 
      "Vampire", "Fairy", "Troll", "Goblin", "Pegasus", "Cyclops", "Sphinx", 
      "Minotaur", "Zombie", "Elf", "Genie", "Kraken", "Sasquatch", "Ghost", 
      "Hydra", "Banshee", "Chimera", "Gnome", "Leprechaun", "Dwarf", "Ogre", 
      "Basilisk", "Gargoyle", "Hobbit", "Harpy", "Siren", "Golem", "Nymph", 
      "Manticore", "Satyr", "Hippogriff", "Leviathan", "Medusa", "Kitsune", 
      "Cerberus", "Dryad", "Wendigo", "Wraith", "Brownie", "Yeti", "Gorgon", 
      "Imp", "Mothman"
    ]
  },
  {
    name: "Weather Phenomena",
    emoji: "🌪️",
    words: [
      "Rainbow", "Tornado", "Lightning", "Hurricane", "Blizzard", "Fog", "Tsunami", 
      "Hail", "Avalanche", "Snow", "Rain", "Storm", "Thunder", "Drought", "Flood", 
      "Eclipse", "Aurora Borealis", "Sandstorm", "Heat Wave", "Wind", "Cyclone", 
      "Frost", "Wildfire", "Typhoon", "Monsoon", "Dust Devil", "Cloud", "Dew", 
      "Ice Storm", "Tornado Alley", "Polar Vortex", "Light Pillar", "Fire Rainbow", 
      "Waterspout", "Haboob", "Ball Lightning", "Derecho", "Microburst", "Sleet", 
      "Sun Dog", "Morning Glory", "Smoke", "Acid Rain", "Snow Roller", "Thunder Snow", 
      "Fata Morgana", "Supercell", "Shelf Cloud", "Mammatus Cloud", "St. Elmo's Fire"
    ]
  },
  {
    name: "Historical Figures",
    emoji: "👑",
    words: [
      "Albert Einstein", "Leonardo da Vinci", "Cleopatra", "Napoleon Bonaparte", 
      "Marie Curie", "Abraham Lincoln", "Julius Caesar", "Joan of Arc", "Mozart", 
      "Gandhi", "Queen Elizabeth I", "Alexander the Great", "Confucius", "Galileo", 
      "Amelia Earhart", "William Shakespeare", "Socrates", "Marco Polo", "Nelson Mandela", 
      "Aristotle", "Martin Luther King Jr.", "Florence Nightingale", "Genghis Khan", 
      "Frida Kahlo", "Winston Churchill", "Henry VIII", "Nikola Tesla", "Catherine the Great", 
      "Charles Darwin", "Vincent van Gogh", "Mata Hari", "Thomas Edison", "Helen Keller", 
      "Tutankhamun", "Rosa Parks", "Isaac Newton", "Malala Yousafzai", "Sigmund Freud", 
      "Anne Frank", "Pablo Picasso", "Archimedes", "Harriet Tubman", "George Washington", 
      "Marie Antoinette", "Mao Zedong", "Ada Lovelace", "Beethoven", "Plato", 
      "Muhammad Ali", "Queen Victoria"
    ]
  },
  {
    name: "Emotions",
    emoji: "😊",
    words: [
      "Joy", "Sadness", "Anger", "Fear", "Surprise", "Disgust", "Love", "Jealousy", 
      "Anxiety", "Excitement", "Guilt", "Pride", "Shame", "Hope", "Disappointment", 
      "Gratitude", "Frustration", "Envy", "Awe", "Confusion", "Curiosity", "Nostalgia", 
      "Contempt", "Satisfaction", "Loneliness", "Relief", "Compassion", "Remorse", 
      "Euphoria", "Melancholy", "Empathy", "Annoyance", "Optimism", "Pessimism", 
      "Contentment", "Embarrassment", "Anticipation", "Amusement", "Regret", "Sympathy", 
      "Boredom", "Admiration", "Indifference", "Serenity", "Outrage", "Acceptance", 
      "Insecurity", "Wonder", "Enthusiasm", "Yearning"
    ]
  },
  {
    name: "Space & Astronomy",
    emoji: "🚀",
    words: [
      "Planet", "Galaxy", "Comet", "Telescope", "Black Hole", "Asteroid", "Space Station", 
      "Supernova", "Moon", "Constellation", "Meteor", "Solar System", "Satellite", 
      "Nebula", "Orbit", "Milky Way", "Space Shuttle", "Jupiter", "Mars", "Solar Eclipse", 
      "Star", "Astronaut", "Venus", "Saturn", "Mercury", "Uranus", "Neptune", "Pluto", 
      "Quasar", "Pulsar", "Gravity", "Comet", "Space Probe", "Lunar Module", "Exoplanet", 
      "Space Telescope", "Rocket", "Cosmos", "Dwarf Planet", "Dark Matter", "Aurora", 
      "Celestial Body", "Big Bang", "Light Year", "Solar Wind", "Cosmic Rays", 
      "Interstellar", "Wormhole", "Red Giant"
    ]
  },
  {
    name: "Art Styles",
    emoji: "🎨",
    words: [
      "Impressionism", "Cubism", "Surrealism", "Renaissance", "Abstract", "Pop Art", 
      "Baroque", "Minimalism", "Gothic", "Realism", "Art Nouveau", "Expressionism", 
      "Dadaism", "Rococo", "Art Deco", "Romanticism", "Futurism", "Modernism", 
      "Neoclassicism", "Post-Impressionism", "Pointillism", "Bauhaus", "Constructivism", 
      "Fauvism", "Folk Art", "Byzantine", "Conceptual Art", "Op Art", "Street Art", 
      "Performance Art", "Digital Art", "Installation Art", "Photorealism", "Classicism", 
      "Mannerism", "Symbolism", "Suprematism", "Primitivism", "Precisionism", "Tonalism", 
      "Ukiyo-e", "Tachisme", "Neo-Expressionism", "Vorticism", "Hyperrealism", 
      "Regionalism", "Divisionism", "Color Field Painting", "Byzantine"
    ]
  },
  {
    name: "Plants & Flowers",
    emoji: "🌷",
    words: [
      "Rose", "Cactus", "Daisy", "Oak Tree", "Sunflower", "Lavender", "Lily", "Pine Tree", 
      "Orchid", "Fern", "Tulip", "Aloe Vera", "Cherry Blossom", "Maple Tree", "Bamboo", 
      "Dandelion", "Venus Flytrap", "Palm Tree", "Bonsai", "Ivy", "Lotus", "Sequoia", 
      "Jasmine", "Baobab", "Daffodil", "Willow Tree", "Hibiscus", "Moss", "Peony", 
      "Redwood", "Magnolia", "Succulent", "Carnation", "Bougainvillea", "Marigold", 
      "Eucalyptus", "Violet", "Weeping Willow", "Bird of Paradise", "Azalea", 
      "Chrysanthemum", "Joshua Tree", "Poppy", "Mangrove", "Iris", "Hydrangea", 
      "Snapdragon", "Olive Tree", "Water Lily", "Foxglove"
    ]
  },
  {
    name: "Transportation",
    emoji: "🚗",
    words: [
      "Car", "Airplane", "Bicycle", "Train", "Submarine", "Helicopter", "Boat", "Truck", 
      "Motorcycle", "Bus", "Hot Air Balloon", "Cruise Ship", "Skateboard", "Spaceship", 
      "Jet Ski", "Yacht", "Tram", "Segway", "Sailboat", "Canoe", "Snowmobile", 
      "Fire Engine", "Ambulance", "Tank", "Hovercraft", "Limousine", "Golf Cart", 
      "Cable Car", "Rickshaw", "Unicycle", "Ice Breaker Ship", "Zeppelin", "Monster Truck", 
      "Steam Locomotive", "Electric Scooter", "Catamaran", "Barge", "Hang Glider", 
      "Dune Buggy", "Rocket", "Fighter Jet", "Drone", "Double-Decker Bus", "Bulldozer", 
      "Tractor", "ATV", "Gondola", "Parachute", "Glider", "Sled"
    ]
  }
];
