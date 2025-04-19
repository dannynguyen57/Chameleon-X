#!/bin/bash

# Create sounds directory if it doesn't exist
mkdir -p public/sounds

# Download sound effects from freesound.org (using direct links to CC0 sounds)
curl -o public/sounds/game-start.mp3 "https://cdn.freesound.org/sounds/415/415762.mp3"
curl -o public/sounds/category-reveal.mp3 "https://cdn.freesound.org/sounds/415/415760.mp3"
curl -o public/sounds/voting-start.mp3 "https://cdn.freesound.org/sounds/415/415761.mp3"
curl -o public/sounds/game-end.mp3 "https://cdn.freesound.org/sounds/415/415763.mp3"
curl -o public/sounds/turn-change.mp3 "https://cdn.freesound.org/sounds/415/415764.mp3"
curl -o public/sounds/word-submit.mp3 "https://cdn.freesound.org/sounds/415/415765.mp3"

echo "Sound effects downloaded successfully!" 