import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { usePuterStore } from "~/lib/puter";
import Navbar from "~/components/navbar";
import ScoreCircle from "~/components/ScoreCircle";
import type { Resume } from "../../types/index.d.ts";

export default function ResumeDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { kv, auth, isLoading: puterLoading } = usePuterStore();
    const [resume, setResume] = useState<Resume | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!puterLoading && !auth.isAuthenticated) {
            navigate(`/auth?next=/resume/${id}`);
            return;
        }

        const fetchResume = async () => {
            if (!id || !kv) return;
            try {
                const data = await kv.get(`resume:${id}`);
                if (data) {
                    setResume(JSON.parse(data));
                } else {
                    setError("Resume not found");
                }
            } catch (err) {
                console.error("Error fetching resume:", err);
                setError("Failed to load resume details");
            } finally {
                setLoading(false);
            }
        };

        if (!puterLoading && auth.isAuthenticated) {
            fetchResume();
        }
    }, [id, kv, auth.isAuthenticated, puterLoading, navigate]);

    if (loading || puterLoading) {
        return (
            <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen">
                <Navbar />
                <div className="flex items-center justify-center h-[calc(100vh-80px)]">
                    <div className="text-xl">Loading...</div>
                </div>
            </main>
        );
    }

    if (error || !resume) {
        return (
            <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen">
                <Navbar />
                <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] gap-4">
                    <div className="text-xl text-red-500">{error || "Resume not found"}</div>
                    <button 
                        onClick={() => navigate('/')}
                        className="primary-button"
                    >
                        Go Home
                    </button>
                </div>
            </main>
        );
    }

    const { feedback, companyName, jobTitle, imagePath } = resume;

    return (
        <main className="bg-[url('/images/bg-main.svg')] bg-cover min-h-screen">
            <Navbar />
            <section className="main-section py-12">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                    {/* Resume Image */}
                    <div className="w-full md:w-1/3 gradient-border p-1">
                        <img 
                            src={imagePath} 
                            alt="Resume" 
                            className="w-full h-auto object-contain rounded-lg"
                        />
                    </div>

                    {/* Feedback Details */}
                    <div className="w-full md:w-2/3 flex flex-col gap-6">
                        <div className="flex justify-between items-center bg-white/50 p-6 rounded-2xl border border-white/20 backdrop-blur-sm">
                            <div>
                                <h1 className="text-3xl font-bold">{companyName}</h1>
                                <p className="text-xl text-gray-600">{jobTitle}</p>
                            </div>
                            <ScoreCircle score={feedback.overallScore} />
                        </div>

                        {/* Detailed Scores */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[
                                { title: "ATS Score", score: feedback.ATS.score, tips: feedback.ATS.tips },
                                { title: "Tone & Style", score: feedback.toneAndStyle.score, tips: feedback.toneAndStyle.tips },
                                { title: "Content", score: feedback.content.score, tips: feedback.content.tips },
                                { title: "Structure", score: feedback.structure.score, tips: feedback.structure.tips },
                                { title: "Skills", score: feedback.skills.score, tips: feedback.skills.tips },
                            ].map((section, idx) => (
                                <div key={idx} className="bg-white/50 p-4 rounded-xl border border-white/20 backdrop-blur-sm">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="font-semibold">{section.title}</h3>
                                        <span className={`text-sm font-bold ${section.score > 70 ? 'text-green-600' : 'text-orange-500'}`}>
                                            {section.score}/100
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        {section.tips.slice(0, 2).map((tip: any, tipIdx: number) => (
                                            <div key={tipIdx} className="flex gap-2 text-sm">
                                                <span className={tip.type === 'good' ? 'text-green-500' : 'text-red-500'}>
                                                    {tip.type === 'good' ? '✓' : '!'}
                                                </span>
                                                <p className="text-gray-700">{tip.tip}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
