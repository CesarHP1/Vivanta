import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "50mb" }));

async function startServer() {

  // Helper to initialize Gemini client lazy-style
  function getGeminiClient(userKey?: string) {
    const apiKey = userKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY_MISSING");
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }

  // Health check API
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      serverTime: new Date().toISOString(),
      hasServerKey: !!process.env.GEMINI_API_KEY,
    });
  });

  // Endpoint to generate family plan
  app.post("/api/plan/generate", async (req, res) => {
    try {
      const { members, prefs, usedMeals, customApiKey } = req.body;
      
      const ai = getGeminiClient(customApiKey);

      const mDesc = members
        .filter((m: any) => m.age !== "")
        .map((m: any) => `${m.name || "Integrante"}: ${m.age} años${m.weight ? " (" + m.weight + "kg)" : ""} [${m.ageClass || ""}]`)
        .join("; ");

      const usedMealsText = usedMeals && usedMeals.length > 0 
        ? `EVITA estrictamente estos platillos usados en las semanas anteriores para mantener la variedad: ${usedMeals.join(", ")}.`
        : "";

      const boneStr = prefs.bones === "si" 
        ? "EVITAR ESTRICTAMENTE HUESOS Y ESPINAS en todas las recetas. Propón pescado fileteado sin espinas, pechuga deshuesada, atún o sardina enlatada molida, o carne molida." 
        : "";

      const restrMap: Record<string, string> = {
        "ninguna": "Sin restricciones especiales.",
        "sin-gluten": "Dieta sin gluten de forma estricta. Evita: trigo, cebada, centeno, avena contaminada. Usa: arroz, maíz, amaranto, quinoa, papa.",
        "sin-lacteos": "Dieta sin lácteos de forma estricta. Usa: bebidas vegetales, tofu, queso de soya.",
        "vegetariano": "Alimentación vegetariana. No incluyas carne, pollo, pescado ni mariscos. Prioriza legumbres, huevo, tofu, cereales integrales y semillas.",
        "reflujo": "DIETA PARA REFLUJO & GASTRITIS: Evitar estrictamente ingredientes ácidos, cítricos, salsas de jitomate, café, chocolate, picante (chile), fritos, grasas excesivas, menta, ajo o cebolla cruda. Usa cocciones a la plancha, al vapor o al horno, y temperatura templada. Alimentos sugeridos: avena, plátano, papaya, manzana, arroz, pollo magro, pescado blanco, calabacitas.",
        "diabetes": "Bajo índice glucémico y control de carbohidratos simples. Evita azúcares refinados, harinas blancas y jugos colados. Usa fibra de legumbres, vegetales y granos enteros.",
        "hipertension": "Bajo en sodio. Limita la sal añadida, embutidos, conservas o alimentos ultraprocesados salados. Incluye potasio y magnesio (aguacate, plátano, verduras verdes).",
        "colesterol": "Bajo en grasas saturadas e hidrogenadas. Evita lácteos enteros, mantequilla, embutidos grasos y carnes rojas gordas. Prefiere aceites vegetales crudos (oliva), aguacate, frutos secos y avena."
      };

      const restrStr = restrMap[prefs.restr] || "Sin restricciones.";

      const promptSystem = `Eres un nutriólogo y chef mexicano experto en dietas familiares para el máximo desarrollo.
Tu misión es diseñar un menú completo de ${prefs.days || 3} días, sabroso, balanceado y adaptado a la cultura mexicana para la siguiente familia:
${mDesc}

Condiciones/Restricciones: ${restrStr}
${boneStr}
${usedMealsText}

PRIORIDADES DE NUTRIENTES:
Debes orientar las recetas para beneficiar órgano(s) o sistema(s) clave del cuerpo de acuerdo a las edades de los miembros (como Cerebro, Corazón, Ojos, Huesos, Sistema Digestivo).

LINEAMIENTOS GENERALES:
- Usa alimentos e ingredientes mexicanos comunes de buena calidad y fácil acceso (como calabacitas, aguacate, nopales, frijoles, avena, pechuga, huevo, atún, amaranto, etc.).
- Incluye una bebida para cada comida que sea sana y apropiada (sin azúcares industriales). Si es para reflujo/gastritis, evita los jugos de cítricos y el café.
- El campo "forWhom" es un texto corto que indica cómo ajustar la porción o consistencia para miembros de distintas edades (ej: "Para el bebé de 1 año (papilla suave sin sal), para el abuelo (cocción muy blanda), porciones normales resto").
- El campo "steps" debe ser detallado e instructivo: indica tiempos (ej: 8-10 minutos), intensidad del fuego o temperatura (ej: "fuego medio-bajo (4/10)"), utensilios recomendados, y una señal visual clara de que ya está listo (ej. "hasta que las calabacitas se sientan tiernas al picar con un tenedor y cambien a un verde vibrante").`;

      const aiResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: "Genera el plan de alimentación estructurado en formato JSON según las instrucciones.",
              },
            ],
          },
        ],
        config: {
          systemInstruction: promptSystem,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              days: {
                type: Type.ARRAY,
                description: "Lista de días que incluye el plan",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    day: { type: Type.STRING, description: "Nombre del día, ej. Día 1, Día 2" },
                    meals: {
                      type: Type.ARRAY,
                      description: "5 comidas del día (Desayuno, Colación, Comida, Merienda, Cena) con sus horarios recomendados",
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          time: { type: Type.STRING, description: "Horario, ej: 7:00 am, 10:00 am, 2:00 pm, 5:30 pm, 7:30 pm" },
                          type: { type: Type.STRING, description: "Tipo de comida, ej: Desayuno, Colación, Comida, Merienda, Cena" },
                          name: { type: Type.STRING, description: "Nombre del platillo mexicano" },
                          description: { type: Type.STRING, description: "Breve descripción apetitosa, nutritiva y descriptiva del platillo" },
                          drink: { type: Type.STRING, description: "Bebida recomendada nutritiva que acompaña y por qué" },
                          tags: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: "Sistemas beneficiados, ej: 'cerebro', 'corazón', 'ojos', 'huesos', 'digestión', 'méxico'"
                          },
                          forWhom: { type: Type.STRING, description: "Indicaciones sobre consistencia, porción o adaptación según edades" },
                          ingredients: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: "Ingredientes con medidas exactas locales"
                          },
                          steps: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: "Pasos detallados de preparación con temperatura del fuego, tiempos y señales visuales de listo"
                          },
                          nutritionNote: { type: Type.STRING, description: "Explicación breve de por qué estos nutrientes benefician a los órganos prioritarios" },
                          brandNote: { type: Type.STRING, description: "Opcional: Recomendación práctica de alguna marca saludable en México" }
                        },
                        required: ["time", "type", "name", "description", "drink", "tags", "ingredients", "steps"]
                      }
                    }
                  },
                  required: ["day", "meals"]
                }
              },
              shoppingList: {
                type: Type.OBJECT,
                description: "Agrupación de todos los ingredientes necesarios para comprar en el supermercado o mercado local",
                properties: {
                  "Frutas y verduras": { type: Type.ARRAY, items: { type: Type.STRING } },
                  "Proteínas y huevo": { type: Type.ARRAY, items: { type: Type.STRING } },
                  "Cereales y granos": { type: Type.ARRAY, items: { type: Type.STRING } },
                  "Lácteos y fermentados": { type: Type.ARRAY, items: { type: Type.STRING } },
                  "Legumbres y de grano": { type: Type.ARRAY, items: { type: Type.STRING } },
                  "Aceites y condimentos": { type: Type.ARRAY, items: { type: Type.STRING } },
                  "Enlatados y despensa": { type: Type.ARRAY, items: { type: Type.STRING } }
                }
              },
              mealNames: {
                type: Type.ARRAY,
                description: "Lista simple de los nombres de los platillos generados (para control de historial posterior y no repetición)",
                items: { type: Type.STRING }
              }
            },
            required: ["days", "shoppingList", "mealNames"]
          }
        }
      });

      const responseText = aiResponse.text;
      if (!responseText) {
        throw new Error("No response text from Gemini API");
      }

      const planData = JSON.parse(responseText.trim());
      res.json(planData);
    } catch (error: any) {
      console.error("Error generating nutrition plan:", error);
      res.status(500).json({
        error: error.message || "Failed to generate plan",
        code: error.message === "GEMINI_API_KEY_MISSING" ? "KEY_MISSING" : "GEN_ERROR"
      });
    }
  });

  // Endpoint to generate tips and exercises
  app.post("/api/plan/tips", async (req, res) => {
    try {
      const { members, prefs, customApiKey } = req.body;
      const ai = getGeminiClient(customApiKey);

      const mDesc = members
        .filter((m: any) => m.age !== "")
        .map((m: any) => `${m.name || "Integrante"}: ${m.age} años [${m.ageClass || ""}]`)
        .join("; ");

      const promptSystem = `Eres un médico del deporte y nutriólogo especialista clínico. Basado en este grupo familiar:
${mDesc}
Bajo la restricción alimentaria o condición de salud de: "${prefs.restr || "ninguna"}"

Diseña actividades físicas y vitaminación preventiva de venta libre apropiada (con sustento científico y marcas comunes en farmacias mexicanas).
NUNCA sugieras medicamentos controlados o de riesgo. Prioriza la seguridad de embarazadas, ancianos y niños pequeños si los hay en el grupo familiar.`;

      const aiResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: "Genera las recomendaciones de ejercicios específicos y vitaminas preventivas en formato JSON.",
              },
            ],
          },
        ],
        config: {
          systemInstruction: promptSystem,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              exercise: {
                type: Type.ARRAY,
                description: "Recomendaciones de ejercicio para los diferentes integrantes en base a sus rangos de edad",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING, description: "Grupo familiar o integrante a quien está dirigido" },
                    icon: { type: Type.STRING, description: "Un emoji divertido de actividad, ej: 🏃, 🏊, 👶, 👵" },
                    ages: { type: Type.STRING, description: "Rango de edad aplicable" },
                    tips: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "3 consejos de entrenamiento seguros y concretos con sus tiempos semanales recomendados"
                    },
                    activities: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "Actividades o deportes recomendados en México"
                    },
                    warning: { type: Type.STRING, description: "Opcional: Alertas médicas o precauciones según edad o condición, o null" }
                  },
                  required: ["label", "icon", "ages", "tips", "activities"]
                }
              },
              vitamins: {
                type: Type.ARRAY,
                description: "Vitaminas, minerales o suplementos de venta libre con sólida evidencia para inmunidad o salud general según el grupo",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: "Nombre de la vitamina o suplemento, ej: Vitamina D3, Vitamina C" },
                    icon: { type: Type.STRING, description: "Emoji, ej: 💊, 🍊" },
                    use: { type: Type.STRING, description: "Para qué sirve principalmente/Beneficio clínico" },
                    evidence: { type: Type.STRING, description: "Explicación breve del sustento de su uso" },
                    dose: { type: Type.STRING, description: "Dosis recomendada sugerida general o por edad" },
                    brand: { type: Type.STRING, description: "Marcas o presentaciones de venta libre populares en farmacias de México" },
                    warning: { type: Type.STRING, description: "Advertencias de cuándo NO consumirla o precauciones importantes" }
                  },
                  required: ["name", "icon", "use", "evidence", "dose", "brand"]
                }
              }
            },
            required: ["exercise", "vitamins"]
          }
        }
      });

      const responseText = aiResponse.text;
      if (!responseText) {
        throw new Error("No response text from Gemini API");
      }

      const tipsData = JSON.parse(responseText.trim());
      res.json(tipsData);
    } catch (error: any) {
      console.error("Error generating sports/vitamin tips:", error);
      res.status(500).json({ error: error.message || "Failed to generate tips" });
    }
  });

  // Vite development middleware or production static build serving
  async function setupServer() {
    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    if (!process.env.VERCEL) {
      const numericPort = typeof PORT === "string" ? parseInt(PORT, 10) : PORT;
      app.listen(numericPort, "0.0.0.0", () => {
        console.log(`[NutriPlan Server] listening on http://localhost:${numericPort}`);
      });
    }
  }

  await setupServer();
}

startServer();

export default app;
