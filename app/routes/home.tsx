import type { Route } from "./+types/home";
import Navbar from "~/components/navbar";
import ResumeCard from "~/components/resumeCard";
import {usePuterStore} from "~/lib/puter";
import {Link, useNavigate} from "react-router";
import {useEffect, useState} from "react";
import type { Resume } from "types";

interface KVItem {
    key: string;
    value: string;
}

export function meta({}: Route.MetaArgs) {
    return [
        { title: "FiltreTalent" },
        { name: "description", content: "Smart feedback for your dream job!" },
    ];
}

export default function Home() {
    const { auth, kv, isLoading } = usePuterStore();
    const navigate = useNavigate();
    const [resumes, setResumes] = useState<Resume[]>([]);
    const [loadingResumes, setLoadingResumes] = useState(false);

    useEffect(() => {
        if (!isLoading && !auth.isAuthenticated) navigate('/auth?next=/');
    }, [auth.isAuthenticated, isLoading, navigate])

    useEffect(() => {
        const loadResumes = async () => {
            if (!auth.isAuthenticated || isLoading) return;
            
            setLoadingResumes(true);

            try {
                const kvResumes = (await kv.list('resume:*', true)) as KVItem[];

                const parsedResumes = kvResumes?.map((item) => {
                    try {
                        return JSON.parse(item.value) as Resume;
                    } catch (e) {
                        console.error("Failed to parse resume:", item.key, e);
                        return null;
                    }
                }).filter((r): r is Resume => r !== null);

                setResumes(parsedResumes || []);
            } catch (error) {
                console.error("Failed to load resumes:", error);
            } finally {
                setLoadingResumes(false);
            }
        }

        loadResumes()
    }, [auth.isAuthenticated, isLoading, kv]);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!auth.isAuthenticated) {
        return null;
    }

    return <main className="bg-[url('/images/bg-main.svg')] bg-cover">
        <Navbar />

        <section className="main-section">
            <div className="page-heading py-16">
                <h1>Suivez vos candidatures et les scores de vos CV</h1>
                {!loadingResumes && resumes?.length === 0 ? (
                    <h2>Aucun CV trouvé. Téléchargez votre premier CV pour obtenir un retour.</h2>
                ): (
                    <h2>Consultez vos soumissions et vérifiez les analyses de l'IA.</h2>
                )}
            </div>
            {loadingResumes && (
                <div className="flex flex-col items-center justify-center">
                    <img src="/images/resume-scan-2.gif" className="w-[200px]" />
                </div>
            )}


            {!loadingResumes && resumes.length > 0 && (
                <div className="resumes-section">
                    {resumes.map((resume) => (
                        <ResumeCard key={resume.id} resume={resume} />
                    ))}
                </div>
            )}

            {!loadingResumes && resumes?.length === 0 && (
                <div className="flex flex-col items-center justify-center mt-10 gap-4">
                    <Link to="/upload" className="primary-button w-fit text-xl font-semibold">
                        Télécharger un CV
                    </Link>
                </div>
            )}
        </section>
    </main>
}