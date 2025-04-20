
import { useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { categories } from "@/lib/word-categories";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function CategorySelection() {
  const { selectCategory, room, playerId } = useGame();
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  if (!room) return null;
  
  const isHost = playerId === room.hostId;
  const canSelectCategory = isHost && !!selectedCategory;
  
  const handleCategorySelect = (categoryName: string) => {
    setSelectedCategory(categoryName);
  };
  
  const handleConfirm = () => {
    if (selectedCategory) {
      selectCategory(selectedCategory);
    }
  };
  
  // Filter categories based on search query
  const filteredCategories = categories.filter(category => 
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <div className="space-y-6">
      <Card className="border-2 border-primary/20 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">
            {isHost ? "Select a Category" : "Waiting for Category Selection"}
          </CardTitle>
          <CardDescription>
            {isHost 
              ? "Choose a category that everyone will describe" 
              : "The host is selecting a category for this round..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isHost ? (
            <>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search categories..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {filteredCategories.length > 0 ? (
                  filteredCategories.map((category) => (
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
                  ))
                ) : (
                  <p className="col-span-3 text-center py-4 text-muted-foreground">
                    No categories match your search
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="text-5xl animate-pulse mb-4">🎲</div>
              <p className="text-lg">The host is selecting a category for this round...</p>
              <p className="text-sm text-muted-foreground mt-2">
                Get ready to receive your role!
              </p>
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
          <CardTitle className="text-xl">Round {room.round} of {room.maxRounds}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {isHost 
              ? "Choose a category for this round. This will determine the secret word that players will describe."
              : "The host is selecting a category. Get ready to receive your role!"}
          </p>
          
          <div className="bg-secondary/10 rounded-lg p-4 mt-4">
            <h3 className="font-medium mb-2">How Categories Work</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>A secret word from the category will be selected</li>
              <li>Everyone except the Chameleon will see the word</li>
              <li>Players take turns giving a one-word clue about the secret word</li>
              <li>The Chameleon must try to blend in without knowing the word</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
