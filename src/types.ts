export interface Member {
  id: number;
  name: string;
  age: string;
  weight: string;
  ageClass: "bebé" | "infante" | "niño" | "adolescente" | "adulto" | "adulto mayor" | "";
}

export interface Preferences {
  days: string;
  restr: string;
  bones: string;
}

export interface Meal {
  time: string;
  type: string;
  name: string;
  description: string;
  drink?: string;
  tags: string[];
  forWhom?: string;
  ingredients: string[];
  steps: string[];
  nutritionNote?: string;
  brandNote?: string;
}

export interface DayPlan {
  day: string;
  meals: Meal[];
}

export interface ShoppingList {
  "Frutas y verduras"?: string[];
  "Proteínas y huevo"?: string[];
  "Cereales y granos"?: string[];
  "Lácteos y fermentados"?: string[];
  "Legumbres y de grano"?: string[];
  "Aceites y condimentos"?: string[];
  "Enlatados y despensa"?: string[];
  [key: string]: string[] | undefined;
}

export interface PlanData {
  days: DayPlan[];
  shoppingList: ShoppingList;
  mealNames?: string[];
}

export interface ExercisePlan {
  label: string;
  icon: string;
  ages: string;
  tips: string[];
  activities: string[];
  warning?: string;
}

export interface VitaminPlan {
  name: string;
  icon: string;
  use: string;
  evidence: string;
  dose: string;
  brand: string;
  warning?: string;
}

export interface TipData {
  exercise: ExercisePlan[];
  vitamins: VitaminPlan[];
}
