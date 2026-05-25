import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Apple,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  Heart,
  TrendingUp,
  Info,
  Check,
  ShoppingBag,
  RefreshCw,
  Award,
  BookOpen,
  Settings,
  HelpCircle,
  Clock,
  Eye,
  AlertTriangle,
  ChevronRight,
  BookmarkCheck,
  ChevronLeft
} from "lucide-react";
import { Member, Preferences, PlanData, TipData, Meal } from "./types";

const THEME_COLORS = {
  g0: "#0a2218", // Deep emerald dark header
  g1: "#163d28", // Solid focus green
  g2: "#256647", // Medium mint dark
  g3: "#3ea06e", // Vibrant leafy green
  g4: "#7dcba4", // Mint light contrast
  g5: "#c8edd8", // Soft highlight background
  cream: "#fbfaf7", // Elegant soft warm background
  warmPaper: "#ffffff", // Pure white sheet accent
};

function getAgeClass(ageStr: string): "bebé" | "infante" | "niño" | "adolescente" | "adulto" | "adulto mayor" | "" {
  const age = parseInt(ageStr, 10);
  if (isNaN(age)) return "";
  if (age <= 1) return "bebé";
  if (age <= 5) return "infante";
  if (age <= 12) return "niño";
  if (age <= 17) return "adolescente";
  if (age <= 59) return "adulto";
  return "adulto mayor";
}

export default function App() {
  // --- STATE ---
  const [activeStep, setActiveStep] = useState<number>(0); // 0: Familia, 1: Ajustes, 2: Mi Plan
  const [members, setMembers] = useState<Member[]>([
    { id: 1, name: "Mamá", age: "36", weight: "62", ageClass: "adulto" },
    { id: 2, name: "Luis", age: "8", weight: "24", ageClass: "niño" }
  ]);
  const [prefs, setPrefs] = useState<Preferences>({
    days: "3",
    restr: "ninguna",
    bones: "no"
  });
  const [customKey, setCustomKey] = useState<string>(() => {
    return localStorage.getItem("np_gemini_api_key") || "";
  });
  const [showKeySettings, setShowKeySettings] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMsg, setLoadingMsg] = useState<string>("");
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [tipData, setTipData] = useState<TipData | null>(null);
  const [historyMeals, setHistoryMeals] = useState<string[]>([]);
  
  // Interactive action states
  const [acceptedDays, setAcceptedDays] = useState<Record<number, boolean>>({});
  const [mealStatus, setMealStatus] = useState<Record<string, "ok" | "skip" | "default">>({});
  const [expandedRecipes, setExpandedRecipes] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<number>(0); // Index of active day, or -1 for super list, -2 for health tips
  const [changingMealId, setChangingMealId] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<{ hasServerKey: boolean } | null>(null);

  // --- ACTIONS ---
  useEffect(() => {
    // Check backend health/auto-key presence
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setServerStatus(data))
      .catch(() => console.log("Standard offline/local preview fallback"));
    
    // Load historical meals from localStorage to prevent repetitive food recommendation
    const storedHistory = localStorage.getItem("np_meal_history");
    if (storedHistory) {
      try {
        setHistoryMeals(JSON.parse(storedHistory));
      } catch (e) {
        setHistoryMeals([]);
      }
    }
  }, []);

  const saveCustomKey = (key: string) => {
    const trimmed = key.trim();
    setCustomKey(trimmed);
    localStorage.setItem("np_gemini_api_key", trimmed);
  };

  const clearCustomKey = () => {
    setCustomKey("");
    localStorage.removeItem("np_gemini_api_key");
  };

  const handleAddMember = () => {
    const newId = members.length > 0 ? Math.max(...members.map(m => m.id)) + 1 : 1;
    setMembers([
      ...members,
      { id: newId, name: "", age: "", weight: "", ageClass: "" }
    ]);
  };

  const handleRemoveMember = (id: number) => {
    if (members.length <= 1) return;
    setMembers(members.filter(m => m.id !== id));
  };

  const handleUpdateMember = (id: number, field: keyof Member, val: string) => {
    setMembers(members.map(m => {
      if (m.id === id) {
        const updated = { ...m, [field]: val };
        if (field === "age") {
          updated.ageClass = getAgeClass(val);
        }
        return updated;
      }
      return m;
    }));
  };

  const validateStep0 = () => {
    const valid = members.some(m => m.age !== "");
    if (!valid) {
      alert("Por favor, ingresa la edad de al menos un integrante de la familia.");
      return false;
    }
    return true;
  };

  const getSystemGoalHighlight = () => {
    const textlist = members.map(m => m.ageClass);
    const goals: string[] = ["México"];
    if (textlist.includes("bebé") || textlist.includes("infante")) goals.push("Desarrollo Cognitivo 🧠", "Digestión extra tierna 🥛");
    if (textlist.includes("niño") || textlist.includes("adolescente")) goals.push("Crecimiento Óseo 🦴", "Foco Escolar 🎯");
    if (textlist.includes("adulto mayor")) goals.push("Cardioprotección ❤️", "Visión 👁️", "Masticación Suave 🍵");
    return goals;
  };

  // --- API CALLE GIGANTES ---
  const handleGeneratePlan = async () => {
    setLoading(true);
    setActiveStep(2);
    setAcceptedDays({});
    setMealStatus({});
    setExpandedRecipes({});
    setActiveTab(0);
    
    const loadingMessages = [
      "Analizando edades, peso y metabolismo familiar...",
      "Calculando micronutrientes para el desarrollo del cerebro y corazón...",
      "Diseñando bebidas tradicionales mexicanas saludables...",
      "Adaptando recetas para la dieta: " + (prefs.restr === "ninguna" ? "Variada Estándar" : prefs.restr) + "...",
      "Eliminando ingredientes difíciles o con exceso de grasa para evitar reflujo...",
      "Compilando la lista inteligente de compras del mercado...",
      "Estructurando instrucciones de cocción sumamente detalladas...",
      "Preparando recomendaciones físicas y vitamínicas preventivas..."
    ];

    let msgIndex = 0;
    setLoadingMsg(loadingMessages[0]);
    const interval = setInterval(() => {
      msgIndex = (msgIndex + 1) % loadingMessages.length;
      setLoadingMsg(loadingMessages[msgIndex]);
    }, 2800);

    try {
      // 1. Genera el plan nutricional
      const planRes = await fetch("/api/plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          members: members.filter(m => m.age !== ""),
          prefs,
          usedMeals: historyMeals,
          customApiKey: customKey || undefined
        })
      });

      if (!planRes.ok) {
        const errObj = await planRes.json();
        throw new Error(errObj.error || "Error de red");
      }

      const planResultData: PlanData = await planRes.json();
      setPlanData(planResultData);

      // Agrega platillos nuevos al historial para la próxima vez
      if (planResultData.mealNames) {
        const updatedHistory = [...new Set([...historyMeals, ...planResultData.mealNames])].slice(-40);
        setHistoryMeals(updatedHistory);
        localStorage.setItem("np_meal_history", JSON.stringify(updatedHistory));
      }

      // 2. Genera los consejos en paralelo
      const tipsRes = await fetch("/api/plan/tips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          members: members.filter(m => m.age !== ""),
          prefs,
          customApiKey: customKey || undefined
        })
      });

      if (tipsRes.ok) {
        const tipsResultData: TipData = await tipsRes.json();
        setTipData(tipsResultData);
      } else {
        setTipData(null);
      }

    } catch (e: any) {
      console.error(e);
      alert("Error al generar el plan de alimentación.\nDetalles: " + (e.message || e));
      setActiveStep(1);
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const handleSingleMealChange = async (dayIndex: number, mealIndex: number) => {
    if (!planData) return;
    const targetMeal = planData.days[dayIndex].meals[mealIndex];
    const uniqueId = `${dayIndex}_${mealIndex}`;
    setChangingMealId(uniqueId);

    try {
      const res = await fetch("/api/plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          members: members.filter(m => m.age !== ""),
          prefs: {
            ...prefs,
            days: "1" // Solo pedimos 1 día rápido para extraer un platillo nuevo
          },
          usedMeals: [...historyMeals, targetMeal.name],
          customApiKey: customKey || undefined
        })
      });

      if (!res.ok) throw new Error("Error trayendo alternativa");

      const tempPlan: PlanData = await res.json();
      const newAlternativeMeal = tempPlan.days[0]?.meals[mealIndex] || tempPlan.days[0]?.meals[0];

      if (newAlternativeMeal) {
        // Actualiza el plan con la variante nueva
        const updatedDays = [...planData.days];
        updatedDays[dayIndex].meals[mealIndex] = newAlternativeMeal;
        setPlanData({
          ...planData,
          days: updatedDays
        });

        // Reinicia veredicto
        setMealStatus(prev => ({
          ...prev,
          [uniqueId]: "default"
        }));
      }

    } catch (err) {
      alert("No logramos conseguir una alternativa en este momento. Inténtalo de nuevo.");
    } finally {
      setChangingMealId(null);
    }
  };

  const toggleAcceptDay = (di: number) => {
    const isNowAccepted = !acceptedDays[di];
    setAcceptedDays(prev => ({ ...prev, [di]: isNowAccepted }));

    // Si aceptamos el día completo, marcamos todas las comidas de ese día como "ok"
    if (planData) {
      planData.days[di].meals.forEach((_, mi) => {
        setMealStatus(prev => ({
          ...prev,
          [`${di}_${mi}`]: isNowAccepted ? "ok" : "default"
        }));
      });
    }
  };

  const handleVoteMeal = (di: number, mi: number, status: "ok" | "skip") => {
    const key = `${di}_${mi}`;
    setMealStatus(prev => ({
      ...prev,
      [key]: prev[key] === status ? "default" : status
    }));
  };

  const toggleRecipeExpand = (di: number, mi: number) => {
    const key = `${di}_${mi}`;
    setExpandedRecipes(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // UI Tags color helpers
  const getTagColorClass = (tag: string) => {
    const t = tag.toLowerCase();
    if (t.includes("cerebro") || t.includes("cognitivo")) return "bg-blue-950/40 text-blue-400 border border-blue-900/50";
    if (t.includes("corazón") || t.includes("cardio")) return "bg-rose-950/40 text-rose-400 border border-rose-900/50";
    if (t.includes("ojos") || t.includes("visión")) return "bg-amber-950/40 text-amber-400 border border-amber-900/50";
    if (t.includes("huesos") || t.includes("óseo")) return "bg-indigo-950/40 text-indigo-400 border border-indigo-900/50";
    if (t.includes("digest") || t.includes("estómago")) return "bg-emerald-950/40 text-emerald-400 border border-emerald-900/50";
    if (t.includes("méxico") || t.includes("mexicano")) return "bg-green-950/40 text-green-400 border border-green-900/50";
    return "bg-slate-800/40 text-slate-350 border border-slate-700/50";
  };

  return (
    <div className="min-h-screen font-sans text-slate-200 pb-16 flex flex-col geometric-bg">
      {/* --- HEADER --- */}
      <header className="bg-slate-900/80 border-b border-slate-800 backdrop-blur-md text-white sticky top-0 z-50 transition-colors">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
              <Apple className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-serif text-lg md:text-xl font-bold tracking-tight text-slate-100">
                NutriPlan<span className="text-indigo-400 font-sans font-light text-sm ml-2 hidden sm:inline">— Plan Nutricional Inteligente</span>
              </h1>
              <p className="text-slate-400 text-[10px] uppercase tracking-widest font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span> Cerebro · Corazón · Digestión
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Status indicator / Key Config Link */}
            <button
              onClick={() => setShowKeySettings(!showKeySettings)}
              className={`text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-2 border font-medium cursor-pointer transition-all ${
                customKey || serverStatus?.hasServerKey
                  ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${customKey || serverStatus?.hasServerKey ? "bg-indigo-400 animate-pulse" : "bg-amber-400 animate-pulse"}`} />
              <span className="hidden sm:inline">
                {customKey || serverStatus?.hasServerKey ? "API Key: Activa (Gratis)" : "Configurar API Key"}
              </span>
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* --- API SETTINGS BANNER (MODAL OVERLAY OR TOP DRAWER) --- */}
      <AnimatePresence>
        {showKeySettings && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-slate-900 text-white border-b border-emerald-900/40 py-6 px-4 relative z-40"
          >
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-teal-300 font-serif font-semibold text-lg">
                  <Settings className="w-5 h-5" />
                  <h3>Configuración del Motor Inteligente (Gemini API)</h3>
                </div>
                <button
                  onClick={() => setShowKeySettings(false)}
                  className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  <span className="text-sm">Cerrar ok</span>
                </button>
              </div>

              <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                Este desarrollo familiar utiliza la inteligencia artificial de **Google Gemini** para estructurar menús completos de alta cocina nutritiva.
                ¡Es **totalmente gratuito** obtener tu API Key en Google AI Studio sin tarjetas de crédito!
              </p>

              <div className="bg-slate-950 p-4 rounded-xl border border-teal-900/50 mb-4">
                <h4 className="text-teal-400 font-semibold text-xs mb-2 uppercase tracking-wider">¿Cómo conseguir una Key Gratis para tu proyecto?</h4>
                <ol className="text-xs text-slate-300 space-y-1.5 list-decimal pl-5">
                  <li>Entra con tu cuenta de Google a <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" className="text-teal-300 underline font-semibold hover:text-teal-200">Google AI Studio</a>.</li>
                  <li>Haz clic en <strong>"Get API Key"</strong> y crea una clave nueva.</li>
                  <li>Pégala aquí abajo para probarla inmediatamente en el navegador, o configúrala en Vercel con el nombre de variable <strong>GEMINI_API_KEY</strong> para que nadie la pueda ver de forma pública.</li>
                </ol>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 max-w-lg mb-2">
                <input
                  type="password"
                  placeholder="Introduce tu clave AI Studio (AIzaSy...)"
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-teal-400 focus:outline-none flex-1 text-white"
                  value={customKey}
                  onChange={(e) => saveCustomKey(e.target.value)}
                />
                {customKey && (
                  <button
                    onClick={clearCustomKey}
                    className="px-3 py-2 bg-red-950 hover:bg-red-900 border border-red-700 rounded-lg text-[10px] text-red-300 cursor-pointer"
                  >
                    Eliminar clave guardada
                  </button>
                )}
              </div>
              <p className="text-[10px] text-teal-400">
                ✔️ {serverStatus?.hasServerKey ? "El servidor de desarrollo ya está inyectado con una API Key global activa." : "El navegador guardará esta llave localmente de forma privada en tu LocalStorage."}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- STEP PROGRESS BAR --- */}
      <div className="max-w-4xl mx-auto w-full px-4 mt-8">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-1.5 flex items-center justify-between shadow-lg max-w-lg mx-auto backdrop-blur-md">
          {[
            { tag: "1. Familia", step: 0 },
            { tag: "2. Personalizar", step: 1 },
            { tag: "3. Nutri-Plan", step: 2 }
          ].map((item) => (
            <button
              key={item.step}
              disabled={loading || (item.step === 2 && !planData)}
              onClick={() => {
                if (item.step === 1 && !validateStep0()) return;
                setActiveStep(item.step);
              }}
              className={`flex-1 py-2 text-center text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeStep === item.step
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                  : activeStep > item.step
                    ? "text-teal-400 bg-teal-500/10 hover:bg-teal-500/20"
                    : "text-slate-450 hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
              }`}
            >
              {item.tag}
            </button>
          ))}
        </div>
      </div>

      {/* --- MAIN WORKSPACE --- */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 mt-8">
        {/* --- STEP 0: MEMBERS ENGINE --- */}
        {activeStep === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center max-w-md mx-auto">
              <h2 className="font-serif text-2xl md:text-3xl text-slate-100 font-bold tracking-tight">¿Quiénes comen hoy?</h2>
              <p className="text-slate-450 text-xs mt-1.5 leading-relaxed">
                Ingresa a los miembros de tu familia. Analizaremos sus edades y necesidades orgánicas para recomendar ingredientes ideales para el cerebro, la vista y el corazón.
              </p>
            </div>

            <div className="card-glass rounded-xl p-6 shadow-xl flex flex-col gap-4 text-slate-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-2">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-widest">Integrantes ({members.length})</span>
                <button
                  onClick={handleAddMember}
                  className="text-xs text-indigo-400 hover:text-white border border-slate-800 rounded-lg py-1.5 px-3.5 flex items-center gap-1.5 font-medium transition-all bg-slate-900/40 hover:bg-slate-850 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar integrante
                </button>
              </div>

              <div className="space-y-4">
                {members.map((m, index) => (
                  <div
                    key={m.id}
                    className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center p-4 rounded-xl border border-slate-800 bg-slate-900/30 hover:bg-slate-850/50 relative transition-all"
                  >
                    <div className="md:col-span-5">
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Nombre o Rol</label>
                      <input
                        type="text"
                        placeholder="ej. Mamá, Papá, Luis..."
                        className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:ring-1 focus:ring-indigo-500/40 focus:border-indigo-500 focus:outline-none"
                        value={m.name}
                        onChange={(e) => handleUpdateMember(m.id, "name", e.target.value)}
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Edad (Años)</label>
                      <input
                        type="number"
                        min="0"
                        max="120"
                        placeholder="Años"
                        className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500/40 focus:border-indigo-500 focus:outline-none"
                        value={m.age}
                        onChange={(e) => handleUpdateMember(m.id, "age", e.target.value)}
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Peso kg (Opcional)</label>
                      <input
                        type="number"
                        min="0"
                        max="300"
                        placeholder="—"
                        className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500/40 focus:border-indigo-500 focus:outline-none"
                        value={m.weight}
                        onChange={(e) => handleUpdateMember(m.id, "weight", e.target.value)}
                      />
                    </div>

                    <div className="md:col-span-1 flex justify-end pt-3 md:pt-0">
                      {members.length > 1 ? (
                        <button
                          onClick={() => handleRemoveMember(m.id)}
                          className="w-8 h-8 rounded-lg bg-red-950/30 hover:bg-red-900/40 border border-red-900/50 text-red-400 flex items-center justify-center transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <div className="w-8" />
                      )}
                    </div>

                    <div className="md:col-span-12 text-[10px] font-medium">
                      {m.ageClass && (
                        <span className="bg-indigo-950/40 text-indigo-400 border border-indigo-900/40 rounded px-2.5 py-0.5 capitalize">
                          Categoría: {m.ageClass}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Dynamic Family Nutrient Diagnosis Card */}
              <div className="mt-6 bg-slate-950/60 text-slate-200 rounded-xl p-5 border border-slate-800/80 shadow">
                <div className="flex items-center gap-2 text-indigo-400 font-serif font-semibold text-sm mb-2">
                  <TrendingUp className="w-4 h-4" />
                  <h4>Áreas Nutricionales Priorizadas por Edad</h4>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {getSystemGoalHighlight().map((item, i) => (
                    <span key={i} className="text-[11px] bg-slate-900 text-slate-350 px-3 py-1 rounded-full border border-slate-800 font-medium">
                      {item}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-slate-450 leading-relaxed">
                  Basado en tu demografía, programaremos al motor Gemini para que asocie de forma natural alimentos ricos en Omega-3 (DHA/EPA), potasio, calcio orgánico y fibra selectiva mexicana.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  if (validateStep0()) setActiveStep(1);
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-3 text-xs font-semibold shadow-lg shadow-indigo-600/15 inline-flex items-center gap-2 cursor-pointer transition-all-all border border-indigo-500/30"
              >
                Continuar a Preferencias <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* --- STEP 1: PREFERENCES PANEL --- */}
        {activeStep === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center max-w-md mx-auto">
              <h2 className="font-serif text-2xl md:text-3xl text-slate-100 font-bold tracking-tight">Personaliza tu nutrición</h2>
              <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
                Afina las condiciones médicas, el tiempo de duración del plan y las restricciones físicas como espinas o huesos de animales.
              </p>
            </div>

            <div className="card-glass rounded-xl p-6 shadow-xl space-y-6 text-slate-200">
              {/* Duration selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2.5">¿Cuántos días planificamos?</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { val: "3", label: "3 días", desc: "Duración corta / prueba" },
                    { val: "4", label: "4 días", desc: "Mitad de semana" },
                    { val: "5", label: "5 días", desc: "Plan de semana laboral" }
                  ].map((item) => (
                    <button
                      key={item.val}
                      onClick={() => setPrefs({ ...prefs, days: item.val })}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        prefs.days === item.val
                          ? "border-indigo-500 bg-indigo-500/15 ring-1 ring-indigo-500"
                          : "border-slate-800 bg-slate-900/30 hover:border-slate-700 hover:bg-slate-850/40 text-slate-300"
                      }`}
                    >
                      <div className={`font-semibold text-xs ${prefs.days === item.val ? "text-indigo-400" : "text-slate-200"}`}>{item.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dietary Restriction selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2.5">
                  Condición de Salud o Restricciones Alimenticias
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: "ninguna", label: "Sin restricciones", icon: "🥦" },
                    { id: "sin-gluten", label: "Sin Gluten", icon: "🌾" },
                    { id: "sin-lacteos", label: "Sin Lácteos", icon: "🥛" },
                    { id: "vegetariano", label: "Vegetariano", icon: "🥗" },
                    { id: "reflujo", label: "Reflujo / Gastritis", icon: "🔥" },
                    { id: "diabetes", label: "Diabetes", icon: "🩸" },
                    { id: "hipertension", label: "Hipertensión", icon: "❤️" },
                    { id: "colesterol", label: "Colesterol Alto", icon: "🥑" }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setPrefs({ ...prefs, restr: item.id })}
                      className={`p-3.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                        prefs.restr === item.id
                          ? "border-indigo-500 bg-indigo-500/15 ring-1 ring-indigo-500"
                          : "border-slate-800 bg-slate-900/30 hover:border-slate-700 hover:bg-slate-850/40 text-slate-300"
                      }`}
                    >
                      <div className="text-lg">{item.icon}</div>
                      <div className={`font-semibold text-[11px] line-clamp-1 ${prefs.restr === item.id ? "text-indigo-400" : "text-slate-200"}`}>{item.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Physical restrictions */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2.5">¿Evitamos huesos y espinas?</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { val: "no", label: "Sin problema", icon: "🥩", desc: "Permitir cualquier corte o presentación" },
                    { val: "si", label: "Evitar estrictamente huesos y espinas", icon: "🛡️", desc: "Solo filetes, carne molida, pechuga limpia y enlatados" }
                  ].map((item) => (
                    <button
                      key={item.val}
                      onClick={() => setPrefs({ ...prefs, bones: item.val })}
                      className={`p-3 rounded-xl border text-left transition-all flex gap-3 h-full cursor-pointer ${
                        prefs.bones === item.val
                          ? "border-indigo-500 bg-indigo-500/15 ring-1 ring-indigo-500"
                          : "border-slate-800 bg-slate-900/30 hover:border-slate-700 hover:bg-slate-850/40 text-slate-300"
                      }`}
                    >
                      <div className="text-xl pt-0.5">{item.icon}</div>
                      <div>
                        <div className={`font-semibold text-xs ${prefs.bones === item.val ? "text-indigo-400" : "text-slate-200"}`}>{item.label}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{item.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Back & Next Navigation Button bar */}
            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => setActiveStep(0)}
                className="text-slate-300 hover:text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer bg-slate-900/60 border border-slate-800 px-4 py-2.5 rounded-xl transition-all"
              >
                <ChevronLeft className="w-4 h-4 text-slate-400" /> Volver a Familia
              </button>
              
              <button
                onClick={handleGeneratePlan}
                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 py-3 text-xs font-semibold shadow-lg shadow-indigo-600/20 inline-flex items-center gap-2 cursor-pointer transition-all border border-indigo-500/30"
              >
                Generar mi plan de cocina <Sparkles className="w-4 h-4 text-indigo-200" />
              </button>
            </div>
          </motion.div>
        )}

        {/* --- STEP 2: NUTRITION RESULTS SCREEN --- */}
        {activeStep === 2 && (
          <div className="space-y-6">
            {/* Loading screen overlay style */}
            {loading ? (
              <div className="card-glass rounded-xl p-12 text-center shadow-xl space-y-6 max-w-xl mx-auto my-12 text-slate-300">
                <div className="w-12 h-12 border-4 border-slate-800 border-t-indigo-500 rounded-full animate-spin mx-auto" />
                <div>
                  <h3 className="font-serif text-lg font-bold text-slate-100">Confeccionando Menú Nutricional Familiar</h3>
                  <p className="text-xs text-slate-450 mt-1.5 max-w-xs mx-auto leading-relaxed">
                    Nuestra IA está preparando recetas mexicanas de fácil digestión balanceadas para el desarrollo de cada miembro.
                  </p>
                </div>
                <div className="bg-slate-950 border border-slate-800 text-indigo-400 text-xs py-2 px-4 rounded-lg font-mono tracking-tight max-w-sm mx-auto">
                  {loadingMsg}
                </div>
              </div>
            ) : (
              planData && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  {/* Result Header Hero Banner */}
                  <div className="bg-slate-900/60 border border-slate-800 text-slate-300 rounded-xl p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 opacity-10">
                      <Apple className="w-64 h-64 text-indigo-500" />
                    </div>
                    
                    <div className="relative z-10 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                          Plan de {prefs.days} Días Generado
                        </span>
                        {prefs.restr !== "ninguna" && (
                          <span className="bg-rose-500/10 text-rose-450 border border-rose-500/30 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                            ⚕️ {prefs.restr.toUpperCase()}
                          </span>
                        )}
                        {prefs.bones === "si" && (
                          <span className="bg-teal-500/10 text-teal-400 border border-teal-500/30 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                            🛡️ Deshuesado
                          </span>
                        )}
                      </div>

                      <h2 className="font-serif text-xl md:text-2xl font-bold text-slate-100">¡Buen Provecho Familiar!</h2>
                      <p className="text-slate-400 text-xs leading-relaxed max-w-xl">
                        Todas las recetas están adaptadas al territorio de compras mexicano, integrando marcas conocidas, tiempos específicos y medidas exactas para cuidar el cerebro, la vista y el corazón de tu familia.
                      </p>

                      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
                        {members.filter(m => m.age !== "").map((m) => (
                          <span key={m.id} className="text-[10px] bg-slate-950/50 border border-slate-800 text-slate-300 px-3 py-1 rounded-full">
                            {m.name || "Integrante"} ({m.age} años)
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* NAV TABS (Day 1, Day 2, Day 3, Groceries, Fitness tips) */}
                  <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-800 pb-1 shrink-0 overflow-x-auto">
                    {planData.days.map((day, di) => {
                      const isDayAccepted = acceptedDays[di];
                      return (
                        <button
                          key={di}
                          onClick={() => setActiveTab(di)}
                          className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all min-w-24 cursor-pointer ${
                            activeTab === di
                              ? "bg-slate-900 border-t-2 border-indigo-500 text-indigo-400 shadow-sm font-bold"
                              : "text-slate-400 hover:text-slate-200"
                          } ${isDayAccepted ? "bg-emerald-950/25 border-emerald-900/50 text-emerald-400 border-t-2 border-emerald-500" : ""}`}
                        >
                          Día {di + 1} {isDayAccepted && "✓"}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setActiveTab(-1)}
                      className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all cursor-pointer ${
                        activeTab === -1
                          ? "bg-slate-900 border-t-2 border-indigo-500 text-indigo-400 shadow-sm font-bold"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      🛒 Lista de Compras
                    </button>
                    {tipData && (
                      <button
                        onClick={() => setActiveTab(-2)}
                        className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-all cursor-pointer ${
                          activeTab === -2
                            ? "bg-slate-900 border-t-2 border-indigo-500 text-indigo-400 shadow-sm font-bold"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        🏃 Ejercicio y Vitaminas
                      </button>
                    )}
                  </div>

                  {/* --- TAB PANEL: DAY MEAL CHANNELS --- */}
                  {activeTab >= 0 && planData.days[activeTab] && (
                    <div className="space-y-6">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800/80 shadow-sm">
                        <div>
                          <h3 className="font-serif text-base font-bold text-slate-100">Menú del Día {activeTab + 1}</h3>
                          <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                            Revisa el desayuno, colaciones, comida, merienda y cena. Toca "Ver Receta" para guías detalladas de preparación.
                          </p>
                        </div>
                        <button
                          onClick={() => toggleAcceptDay(activeTab)}
                          className={`text-xs font-semibold px-4 py-2 rounded-xl border cursor-pointer transition-all ${
                            acceptedDays[activeTab]
                              ? "bg-emerald-600 text-white border-emerald-505"
                              : "bg-slate-950/60 text-emerald-400 border-emerald-900 hover:bg-emerald-950"
                          }`}
                        >
                          {acceptedDays[activeTab] ? "Día Aceptado ✓" : "Aceptar Día Completo ✅"}
                        </button>
                      </div>

                      <div className="space-y-4">
                        {planData.days[activeTab].meals.map((meal, mi) => {
                          const meal_id = `${activeTab}_${mi}`;
                          const status = mealStatus[meal_id] || "default";
                          const isExpanded = expandedRecipes[meal_id] || false;
                          const isChanging = changingMealId === meal_id;

                          return (
                            <div
                              key={mi}
                              className={`rounded-2xl border transition-all ${
                                status === "ok"
                                  ? "border-emerald-500/60 shadow-lg shadow-emerald-950/20 bg-emerald-950/15"
                                  : status === "skip"
                                    ? "border-slate-850 opacity-30 hover:opacity-100"
                                    : "border-slate-800/80 bg-slate-900/20 hover:border-slate-700"
                              }`}
                            >
                              <div className="p-5 flex flex-col md:flex-row gap-4 items-start">
                                {/* Timeline time circle */}
                                <div className="flex md:flex-col items-center gap-2 md:gap-1 text-center shrink-0">
                                  <div className="bg-slate-950 border border-slate-850 text-slate-350 font-semibold text-[10px] tracking-tight px-3 py-1 rounded-full flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-indigo-400" />
                                    {meal.time}
                                  </div>
                                  <span className="text-[10px] text-indigo-400 uppercase tracking-widest font-bold md:mt-1">{meal.type}</span>
                                </div>

                                {/* Content portion */}
                                <div className="flex-1 space-y-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="font-serif text-[15px] font-bold text-slate-100 leading-snug">{meal.name}</h4>
                                    {meal.tags.map((tag, ti) => (
                                      <span key={ti} className={`text-[9px] px-2 py-0.5 rounded border capitalize font-semibold ${getTagColorClass(tag)}`}>
                                        {tag}
                                      </span>
                                    ))}
                                  </div>

                                  <p className="text-xs text-slate-400 leading-relaxed">{meal.description}</p>

                                  {/* Drink recommendation card */}
                                  {meal.drink && (
                                    <div className="bg-slate-950/50 border border-slate-850 rounded-lg p-2.5 flex items-start gap-2 max-w-xl">
                                      <span className="text-base leading-none">🥤</span>
                                      <div className="text-[11px] text-slate-350 leading-normal">
                                        <strong>Bebida recomendada:</strong> {meal.drink}
                                      </div>
                                    </div>
                                  )}

                                  {/* Age specific portion alteration notice */}
                                  {meal.forWhom && (
                                    <p className="text-[10px] bg-slate-950/40 text-slate-350 px-2.5 py-1 rounded font-medium border-l-2 border-indigo-500 max-w-xl inline-block">
                                      👥 {meal.forWhom}
                                    </p>
                                  )}

                                  {/* Toggle detailed recipe button */}
                                  <div className="pt-2">
                                    <button
                                      onClick={() => toggleRecipeExpand(activeTab, mi)}
                                      className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                                    >
                                      <BookOpen className="w-3.5 h-3.5" />
                                      {isExpanded ? "Ocultar receta" : "Ver receta completa (ingredientes y preparación)"}
                                    </button>
                                  </div>

                                  {/* Detailed Recipe steps and list drawer */}
                                  {isExpanded && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: "auto" }}
                                      className="border-t border-slate-800 pt-4 mt-3 space-y-4"
                                    >
                                      <div>
                                        <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Ingredientes con Medidas</h5>
                                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-450 list-inside list-disc">
                                          {meal.ingredients.map((ing, ii) => (
                                            <li key={ii} className="leading-snug">{ing}</li>
                                          ))}
                                        </ul>
                                      </div>

                                      <div>
                                        <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Preparación Detallada</h5>
                                        <ol className="space-y-3.5 list-decimal pl-4 text-xs text-slate-400">
                                          {meal.steps.map((step, si) => (
                                            <li key={si} className="pl-1 leading-relaxed text-slate-350">
                                              {step}
                                            </li>
                                          ))}
                                        </ol>
                                      </div>

                                      {/* Dietary Health Explanation Card */}
                                      {meal.nutritionNote && (
                                        <div className="bg-emerald-950/30 text-emerald-400 border border-emerald-900/40 rounded-lg p-3 text-[11px] leading-relaxed">
                                          💡 <strong>Diagnóstico Nutricional:</strong> {meal.nutritionNote}
                                        </div>
                                      )}

                                      {/* Suggested Market Brand Note */}
                                      {meal.brandNote && (
                                        <div className="bg-amber-950/30 text-amber-400 border border-amber-900/40 rounded-lg p-2.5 text-[10px] leading-relaxed">
                                          🏷️ <strong>Opción Comercial en México:</strong> {meal.brandNote}
                                        </div>
                                      )}
                                    </motion.div>
                                  )}
                                </div>

                                {/* Decision-making interactive cluster on the right */}
                                <div className="border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-4 self-stretch flex md:flex-col items-center justify-between md:justify-center gap-2 shrink-0">
                                  <button
                                    onClick={() => handleVoteMeal(activeTab, mi, "ok")}
                                    className={`flex-1 md:w-28 py-2 text-center rounded-xl text-xs font-semibold border cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                                      status === "ok"
                                        ? "bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-500/10"
                                        : "bg-slate-900/40 text-slate-400 border-slate-800 hover:bg-slate-850/50 hover:text-white"
                                    }`}
                                  >
                                    <Check className="w-3.5 h-3.5" /> Me gusta
                                  </button>

                                  <button
                                    onClick={() => handleVoteMeal(activeTab, mi, "skip")}
                                    className={`flex-1 md:w-28 py-2 text-center rounded-xl text-xs font-semibold border cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                                      status === "skip"
                                        ? "bg-slate-800 text-white border-slate-700 shadow-md shadow-slate-900/20"
                                        : "bg-slate-900/40 text-slate-400 border-slate-800 hover:bg-slate-850/50 hover:text-white"
                                    }`}
                                  >
                                    Omitir
                                  </button>

                                  <button
                                    disabled={isChanging}
                                    onClick={() => handleSingleMealChange(activeTab, mi)}
                                    className="flex-1 md:w-28 py-2 text-center rounded-xl text-xs font-semibold bg-slate-900/40 border border-slate-800 text-slate-300 hover:border-indigo-400 hover:text-indigo-300 flex items-center justify-center gap-1 cursor-pointer transition-all disabled:opacity-40"
                                  >
                                    {isChanging ? (
                                      <RefreshCw className="w-3 h-3 animate-spin text-slate-400" />
                                    ) : (
                                      <RefreshCw className="w-3 h-3 text-slate-400" />
                                    )}
                                    {isChanging ? "Cambio..." : "Cambiar 🔄"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* --- TAB PANEL: SHOPPING CATALOGUE --- */}
                  {activeTab === -1 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6"
                    >
                      <div className="card-glass p-5 rounded-xl border border-slate-800/80 shadow-sm">
                        <div className="flex items-center gap-2 mb-1.5">
                          <ShoppingBag className="w-5 h-5 text-indigo-400" />
                          <h3 className="font-serif text-base font-bold text-slate-100">Cesta Súper Inteligente</h3>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-normal font-sans">
                          Hemos consolidado todo lo necesario de las recetas para tu visita al mercado. Estos alimentos aguantan perfectamente congelación o refrigerado.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(planData.shoppingList as Record<string, string[] | undefined>).map(([category, items]) => {
                          if (!items || items.length === 0) return null;
                          return (
                            <div key={category} className="card-glass rounded-xl border border-slate-800/80 p-4 shadow-sm">
                              <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest border-b border-slate-800/80 pb-2 mb-3">
                                {category}
                              </h4>
                              <ul className="space-y-1.5">
                                {(items || []).map((item, index) => (
                                  <li key={index} className="flex items-start gap-2.5 text-xs text-slate-300">
                                    <input
                                      type="checkbox"
                                      className="mt-0.5 rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                                    />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {/* --- TAB PANEL: FITNESS & PREVENTIVE VITAMINS --- */}
                  {activeTab === -2 && tipData && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6"
                    >
                      {/* Physical conditioning column */}
                      {tipData.exercise && tipData.exercise.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                            <TrendingUp className="w-5 h-5 text-indigo-400" />
                            <h3 className="font-serif text-base font-bold text-slate-100">🏃 Rutinas Físicas Familiares Sugeridas</h3>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {tipData.exercise.map((group, index) => (
                              <div key={index} className="card-glass p-5 rounded-xl border border-slate-800/85 shadow-sm space-y-3">
                                <div className="flex items-start gap-3">
                                  <div className="w-10 h-10 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center text-xl shrink-0">
                                    {group.icon || "🏃"}
                                  </div>
                                  <div>
                                    <h4 className="font-serif text-[14px] font-bold text-slate-100 leading-tight">{group.label}</h4>
                                    <p className="text-[10px] text-slate-450 mt-0.5">Dirigido a: {group.ages}</p>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ejercicios Concretos:</span>
                                  <ul className="text-xs text-slate-350 space-y-1 list-inside list-disc leading-relaxed">
                                    {group.tips.slice(0, 3).map((tip, ti) => (
                                      <li key={ti}>{tip}</li>
                                    ))}
                                  </ul>
                                </div>

                                {group.activities && group.activities.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 pt-2">
                                    {group.activities.map((act, ai) => (
                                      <span key={ai} className="bg-indigo-950/40 text-indigo-400 border border-indigo-900/30 text-[9px] font-semibold px-2 py-0.5 rounded-full">
                                        {act}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {group.warning && (
                                  <div className="bg-amber-950/20 text-amber-400 border border-amber-900/30 p-2 rounded text-[10px] flex items-start gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                    <span>{group.warning}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Vitamins preventatives column */}
                      {tipData.vitamins && tipData.vitamins.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 border-b border-slate-800 pb-2 pt-4">
                            <Award className="w-5 h-5 text-indigo-400" />
                            <h3 className="font-serif text-base font-bold text-slate-100">💊 Refuerzo Sano e Inmunológico de Venta Libre</h3>
                          </div>
                          
                          <p className="text-slate-400 text-xs leading-normal">
                            Sugerencias de vitaminación común basada en guías clínicas mexicanas para la prevención de gripes estacionales y fatiga.
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {tipData.vitamins.map((vit, index) => (
                              <div key={index} className="card-glass p-5 rounded-xl border border-slate-800/85 shadow-sm space-y-2.5">
                                <div className="flex items-center gap-2 text-slate-205">
                                  <span className="text-xl">{vit.icon || "💊"}</span>
                                  <h4 className="font-serif text-[14px] font-bold text-slate-100">{vit.name}</h4>
                                </div>

                                <div className="grid grid-cols-1 bg-slate-950/40 p-3 rounded-lg border border-slate-850 gap-2 text-xs text-slate-400">
                                  <div>
                                    <strong className="text-slate-300 block text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">Aplicación:</strong>
                                    {vit.use}
                                  </div>
                                  <div>
                                    <strong className="text-slate-300 block text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">Sustento científico:</strong>
                                    {vit.evidence}
                                  </div>
                                  <div>
                                    <strong className="text-slate-300 block text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">Dosis sugerida:</strong>
                                    {vit.dose}
                                  </div>
                                  <div>
                                    <strong className="text-slate-300 block text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">Farmacias mexicanas populares:</strong>
                                    {vit.brand}
                                  </div>
                                </div>

                                {vit.warning && (
                                  <div className="bg-rose-950/35 text-rose-400 border border-rose-900/40 p-2.5 rounded text-[10px] flex items-start gap-1">
                                    <Info className="w-3.5 h-3.5 text-rose-550 shrink-0 mt-0.5" />
                                    <span><strong>Precaución:</strong> {vit.warning}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          <div className="bg-amber-950/20 text-amber-400 border border-amber-900/30 p-4 rounded-xl text-xs leading-relaxed">
                            💡 <strong>Aviso Médico:</strong> Estas recomendaciones nutricionales y físicas son con fines informativos preventivos. Antes de consumir cualquier vitamina o suplemento en bebés, durante el embarazo o con condiciones crónicas, asiste con tu médico de cabecera.
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Foot Navigation Button drawer */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-slate-800">
                    <button
                      onClick={() => {
                        setActiveStep(0);
                      }}
                      className="text-slate-300 hover:text-white font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer bg-slate-900/60 hover:bg-slate-900/90 px-4 py-2.5 rounded-xl border border-slate-800 transition-all"
                    >
                      ← Crear Nueva Familia
                    </button>

                    <button
                      onClick={() => {
                        setActiveStep(1);
                      }}
                      className="text-slate-300 hover:text-white font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer bg-slate-900/60 hover:bg-slate-900/90 px-4 py-2.5 rounded-xl border border-slate-800 transition-all"
                    >
                      ↩ Cambiar Parámetros
                    </button>

                    <button
                      onClick={handleGeneratePlan}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 py-2.5 text-xs font-semibold shadow-lg shadow-indigo-600/15 inline-flex items-center gap-2 cursor-pointer transition-all border border-indigo-500/35"
                    >
                      Re-generar otro Menú ♻️
                    </button>
                  </div>
                </motion.div>
              )
            )}
          </div>
        )}
      </main>
    </div>
  );
}
