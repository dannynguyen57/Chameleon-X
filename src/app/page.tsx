import DevModeSetup from '@/components/dev/DevModeSetup';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function Home() {
  const isDevMode = process.env.NEXT_PUBLIC_ENABLE_DEV_MODE === 'true';

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-4xl font-bold text-center mb-4">
              Secret Agent Wordsmith
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-center text-lg text-muted-foreground">
              A social deduction word game where players try to identify the imposter while describing a secret word.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link href="/create">
                  Create Game
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/join">
                  Join Game
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {isDevMode && (
        <div className="fixed bottom-4 right-4 z-50">
          <DevModeSetup />
        </div>
      )}
    </main>
  );
} 