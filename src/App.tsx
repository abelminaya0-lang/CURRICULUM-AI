import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  FileText, 
  Play, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Database,
  Cpu,
  Upload,
  Send,
  User,
  Phone,
  Briefcase,
  LogOut,
  LogIn,
  Search,
  Filter,
  Eye,
  MessageCircle,
  ExternalLink,
  Clock,
  ChevronRight,
  ShieldCheck,
  Trash2,
  AlertCircle
} from "lucide-react";
import { 
  db, 
  auth, 
  storage, 
  googleProvider, 
  OperationType, 
  handleFirestoreError 
} from "./firebase";
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser 
} from "firebase/auth";
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  updateDoc, 
  doc, 
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { evaluateCV } from "./services/geminiService";
import { cn } from "./lib/utils";

// --- Types ---
interface Candidate {
  id: string;
  fullName: string;
  phone: string;
  position: string;
  cvUrl: string;
  cvText?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  score?: number;
  aiReason?: string;
  createdAt: any;
}

// --- Components ---

const CandidateForm = ({ onComplete }: { onComplete: () => void }) => {
  const [formData, setFormData] = useState({ fullName: "", phone: "", position: "" });
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsSubmitting(true);
    setError(null);
    try {
      // 1. Upload File to Storage
      const storageRef = ref(storage, `cvs/${Date.now()}_${file.name}`);
      const uploadResult = await uploadBytes(storageRef, file);
      const cvUrl = await getDownloadURL(uploadResult.ref);

      // 2. Add to Firestore
      const candidateData = {
        fullName: formData.fullName,
        phone: formData.phone,
        position: formData.position,
        cvUrl,
        status: "PENDING",
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "candidates"), candidateData);

      // 3. Show success message immediately
      onComplete();

      // 4. AI Evaluation in the background
      (async () => {
        try {
          const result = await evaluateCV(`Nombre: ${formData.fullName}\nPuesto: ${formData.position}\nCV: ${file.name}`);
          await updateDoc(doc(db, "candidates", docRef.id), {
            score: result.puntaje,
            aiReason: result.motivo,
            status: result.resultado === "APTO" ? "APPROVED" : "REJECTED"
          });
        } catch (aiError) {
          console.error("AI Evaluation failed:", aiError);
        }
      })();
    } catch (err: any) {
      console.error("Submission error:", err);
      setError(err.message || "Error al enviar la postulación. Verifica tu conexión.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.form 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit} 
      className="space-y-6 bg-white p-8 rounded-3xl shadow-xl border border-slate-100"
    >
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-600" /> Nombre Completo
          </label>
          <input
            required
            type="text"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            placeholder="Ej: Juan Pérez"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Phone className="w-4 h-4 text-indigo-600" /> Teléfono / WhatsApp
          </label>
          <input
            required
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            placeholder="Ej: +51 987 654 321"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-indigo-600" /> Puesto al que postula
          </label>
          <input
            required
            type="text"
            value={formData.position}
            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
            className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            placeholder="Ej: Cocinero, Mesero, etc."
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" /> Adjuntar CV (PDF o Word)
          </label>
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all",
              file ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
            )}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
              accept=".pdf,.doc,.docx"
            />
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <CheckCircle2 className="text-indigo-600 w-8 h-8" />
                <span className="font-medium text-slate-700">{file.name}</span>
                <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-xs text-red-500 hover:underline">Cambiar archivo</button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="text-slate-400 w-8 h-8" />
                <span className="text-slate-500">Haz clic para subir o arrastra tu CV aquí</span>
                <span className="text-xs text-slate-400">Formatos aceptados: PDF, Word</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <button
        disabled={isSubmitting || !file}
        className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-200"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Enviando postulación...
          </>
        ) : (
          <>
            <Send className="w-5 h-5" />
            Enviar Postulación
          </>
        )}
      </button>
    </motion.form>
  );
};

const SuccessMessage = () => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className="text-center space-y-6 bg-white p-12 rounded-3xl shadow-xl border border-slate-100"
  >
    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
      <CheckCircle2 className="w-12 h-12" />
    </div>
    <div className="space-y-2">
      <h2 className="text-3xl font-black text-slate-900">¡Gracias por postular!</h2>
      <p className="text-slate-500 text-lg">Hemos recibido tu CV. Nuestro equipo lo revisará y te llamaremos pronto.</p>
    </div>
    <button 
      onClick={() => window.location.reload()}
      className="text-indigo-600 font-bold hover:underline"
    >
      Volver al formulario
    </button>
  </motion.div>
);

const CandidateCard = ({ candidate }: { candidate: Candidate }) => {
  const handleStatusChange = async (newStatus: "APPROVED" | "REJECTED") => {
    try {
      await updateDoc(doc(db, "candidates", candidate.id), { status: newStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "candidates");
    }
  };

  const whatsappUrl = `https://wa.me/${candidate.phone.replace(/\D/g, '')}`;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-1">
          <h4 className="font-bold text-lg text-slate-900">{candidate.fullName}</h4>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Briefcase className="w-3 h-3" /> {candidate.position}
            <span className="mx-1">•</span>
            <Clock className="w-3 h-3" /> {candidate.createdAt instanceof Timestamp ? candidate.createdAt.toDate().toLocaleDateString() : "Reciente"}
          </div>
        </div>
        <div className={cn(
          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
          candidate.status === "APPROVED" ? "bg-green-100 text-green-700" : 
          candidate.status === "REJECTED" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
        )}>
          {candidate.status === "APPROVED" ? "Aprobado" : candidate.status === "REJECTED" ? "No Apto" : "Pendiente"}
        </div>
      </div>

      {candidate.aiReason && (
        <div className="bg-slate-50 p-3 rounded-xl mb-4 text-xs text-slate-600 italic border-l-4 border-indigo-400">
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-indigo-600 not-italic">Análisis IA:</span>
            <span className="font-bold text-indigo-600 not-italic">{candidate.score}/100</span>
          </div>
          "{candidate.aiReason}"
        </div>
      )}

      <div className="flex items-center gap-2">
        <a 
          href={candidate.cvUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors"
        >
          <Eye className="w-3 h-3" /> Ver CV
        </a>
        <a 
          href={whatsappUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex-1 bg-green-500 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-green-600 transition-colors"
        >
          <MessageCircle className="w-3 h-3" /> WhatsApp
        </a>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2">
        {candidate.status !== "APPROVED" && (
          <button 
            onClick={() => handleStatusChange("APPROVED")}
            className="flex-1 text-[10px] font-bold text-green-600 hover:bg-green-50 py-1 rounded transition-colors"
          >
            Aprobar
          </button>
        )}
        {candidate.status !== "REJECTED" && (
          <button 
            onClick={() => handleStatusChange("REJECTED")}
            className="flex-1 text-[10px] font-bold text-red-600 hover:bg-red-50 py-1 rounded transition-colors"
          >
            Rechazar
          </button>
        )}
      </div>
    </motion.div>
  );
};

const LoadingScreen = () => (
  <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
    <div className="bg-indigo-600 p-3 rounded-2xl animate-bounce">
      <Cpu className="text-white w-8 h-8" />
    </div>
    <div className="flex items-center gap-2 text-slate-400 font-medium">
      <Loader2 className="w-4 h-4 animate-spin" />
      Cargando sistema...
    </div>
  </div>
);

export default function App() {
  const [view, setView] = useState<"candidate" | "recruiter">("candidate");
  const [submitted, setSubmitted] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsLoading(false);
    });

    const q = query(collection(db, "candidates"), orderBy("createdAt", "desc"));
    const unsubscribeFirestore = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Candidate));
      setCandidates(list);
    }, (error) => {
      if (user) handleFirestoreError(error, OperationType.LIST, "candidates");
    });

    return () => {
      unsubscribeAuth();
      unsubscribeFirestore();
    };
  }, [user]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setView("recruiter");
    } catch (error) {
      console.error(error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setView("candidate");
  };

  const approvedCandidates = candidates.filter(c => c.status === "APPROVED");
  const rejectedCandidates = candidates.filter(c => c.status === "REJECTED");
  const pendingCandidates = candidates.filter(c => c.status === "PENDING");

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Cpu className="text-white w-5 h-5" />
            </div>
            <h1 className="font-bold text-xl tracking-tight hidden sm:block">AI Recruitment</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden md:block">
                  <p className="text-xs font-bold">{user.displayName}</p>
                  <p className="text-[10px] text-slate-500">Administrador</p>
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
                  title="Cerrar Sesión"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="text-sm font-bold text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-xl transition-all flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" /> Acceso Reclutador
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {view === "candidate" ? (
          <div className="max-w-xl mx-auto space-y-8">
            <div className="text-center space-y-3">
              <h2 className="text-4xl font-black text-slate-900">Únete a nuestro equipo</h2>
              <p className="text-slate-500 text-lg">Sube tu CV y deja que nuestra IA analice tu perfil en segundos.</p>
            </div>
            {submitted ? <SuccessMessage /> : <CandidateForm onComplete={() => setSubmitted(true)} />}
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-3xl font-black text-slate-900">Panel de Reclutamiento</h2>
                <p className="text-slate-500">Gestiona y revisa las postulaciones filtradas por IA.</p>
              </div>
              <div className="flex gap-4">
                <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Total</span>
                  <span className="text-xl font-black text-indigo-600">{candidates.length}</span>
                </div>
                <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Aprobados</span>
                  <span className="text-xl font-black text-green-600">{approvedCandidates.length}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Column: Approved */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <CheckCircle2 className="text-green-500 w-5 h-5" /> Aprobados por IA
                  </h3>
                  <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">{approvedCandidates.length}</span>
                </div>
                <div className="space-y-4 min-h-[200px] bg-slate-100/50 p-4 rounded-3xl border border-slate-200/50">
                  {approvedCandidates.length === 0 ? (
                    <p className="text-center text-slate-400 text-xs py-10">No hay candidatos aprobados aún.</p>
                  ) : (
                    approvedCandidates.map(c => <CandidateCard key={c.id} candidate={c} />)
                  )}
                </div>
              </div>

              {/* Column: Pending / Review */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <Clock className="text-amber-500 w-5 h-5" /> En Revisión
                  </h3>
                  <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">{pendingCandidates.length}</span>
                </div>
                <div className="space-y-4 min-h-[200px] bg-slate-100/50 p-4 rounded-3xl border border-slate-200/50">
                  {pendingCandidates.length === 0 ? (
                    <p className="text-center text-slate-400 text-xs py-10">No hay candidatos pendientes.</p>
                  ) : (
                    pendingCandidates.map(c => <CandidateCard key={c.id} candidate={c} />)
                  )}
                </div>
              </div>

              {/* Column: Rejected */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <XCircle className="text-red-500 w-5 h-5" /> No Aptos
                  </h3>
                  <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">{rejectedCandidates.length}</span>
                </div>
                <div className="space-y-4 min-h-[200px] bg-slate-100/50 p-4 rounded-3xl border border-slate-200/50">
                  {rejectedCandidates.length === 0 ? (
                    <p className="text-center text-slate-400 text-xs py-10">No hay candidatos rechazados.</p>
                  ) : (
                    rejectedCandidates.map(c => <CandidateCard key={c.id} candidate={c} />)
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 py-12 border-t border-slate-200 text-center">
        <p className="text-slate-400 text-sm flex items-center justify-center gap-2">
          AI Recruitment System • {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
