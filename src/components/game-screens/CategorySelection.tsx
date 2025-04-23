import { useState, useEffect } from "react";
import { useGame } from "@/hooks/useGame";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { categories } from "@/lib/word-categories";

export default function CategorySelection() {
  const { selectCategory, room, playerId } = useGame();
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  
  useEffect(() => {
    console.log('CategorySelection mounted:', {
      roomId: room?.id,
      roomState: room?.state,
      playerId,
      isHost: playerId === room?.host_id
    });
  }, [room, playerId]);

  if (!room) {
    console.log('No room found in CategorySelection');
    return null;
  }
  
  const isHost = playerId === room.host_id;
  const canSelectCategory = isHost && !!selectedCategory;
  
  const handleCategorySelect = (categoryName: string) => {
    console.log('Category selected:', {
      categoryName,
      isHost,
      roomId: room.id
    });
    setSelectedCategory(categoryName);
  };
  
  const handleConfirm = async () => {
    if (selectedCategory) {
      console.log('Confirming category selection:', {
        categoryName: selectedCategory,
        isHost,
        roomId: room.id
      });
      const category = categories.find(c => c.name === selectedCategory);
      if (category) {
        try {
          await selectCategory(category);
          console.log('Category selection successful');
        } catch (error) {
          console.error('Error selecting category:', error);
        }
      }
    }
  };
  
  return (
    <div className="space-y-6">
      <Card className="border-2 border-primary/20 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">
            {isHost ? "Select a Category" : "Waiting for Category Selection"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isHost ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {categories.map((category) => (
                <Button
                  key={category.name}
                  variant={selectedCategory === category.name ? "default" : "outline"}
                  className={`h-24 flex flex-col items-center justify-center transition-all ${
                    selectedCategory === category.name 
                    ? "border-2 border-primary scale-105" 
                    : ""
                  }`}
                  onClick={() => handleCategorySelect(category.name)}
                >
                  <span className="text-2xl mb-1">{category.emoji}</span>
                  <span className="text-sm font-medium">{category.name}</span>
                </Button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl animate-pulse mb-3">🎲</div>
              <p>The host is selecting a category for this round...</p>
            </div>
          )}
        </CardContent>
        {isHost && (
          <CardFooter>
            <Button
              onClick={handleConfirm}
              disabled={!canSelectCategory}
              className="w-full"
            >
              {selectedCategory ? `Confirm: ${selectedCategory}` : "Select a category"}
            </Button>
          </CardFooter>
        )}
      </Card>
      
      <Card className="border border-secondary/20">
        <CardHeader>
          <CardTitle className="text-xl">Round {room.round} of {room.max_rounds}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {isHost 
              ? "Choose a category for this round. This will determine the secret word that players will describe."
              : "The host is selecting a category. Get ready to receive your role!"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
