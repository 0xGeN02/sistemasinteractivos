import { BookOpen, Settings, User } from "lucide-react";

export function Header() {
  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <BookOpen className="h-8 w-8 text-primary" />
          <h1 className="font-semibold">StudyAI</h1>
        </div>
      </div>
    </header>
  );
}