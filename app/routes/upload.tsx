import React, {type FormEvent, useState, useEffect} from 'react'
import Navbar from "~/components/navbar";
import FileUploader from "~/components/FileUploader";
import {usePuterStore} from "~/lib/puter";
import {useNavigate} from "react-router";
import {convertPdfToImage} from "~/lib/pdf2img";
import {generateUUID} from "~/lib/utils";
import {prepareInstructions} from "../../constants";

const Upload = () => {

    const { auth, isLoading, fs, ai, kv } = usePuterStore();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isLoading && !auth.isAuthenticated) navigate('/auth?next=/upload');
    }, [auth.isAuthenticated, isLoading, navigate]);

    const [isProcessing, setIsProcessing] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [formData, setFormData] = useState({
        companyName: '',
        jobTitle: '',
        jobDescription: ''
    });


    const handleAnalyze = async ({ companyName, jobTitle, jobDescription, file }: { companyName: string, jobTitle: string, jobDescription: string, file: File  }) =>{
        console.log('Starting analysis for file:', file.name);
        setIsProcessing(true);
        setError(null);
        setStatusText('Téléchargement du fichier...');
        setFormData({ companyName, jobTitle, jobDescription });

        try {
            console.log('Uploading the file...');
            const uploadedFileResult = await fs.upload([file]);
            console.log('Upload result:', uploadedFileResult);
            // Puter's fs.upload often returns an array even for single files, but some versions might return the object directly.
            // In the user's "working" code, it's used as 'const uploadedFile = await fs.upload([file]);' then 'uploadedFile.path'.
            // This suggests it might be returning the file object directly or we need to handle both.
            const uploadedFile = Array.isArray(uploadedFileResult) ? uploadedFileResult[0] : uploadedFileResult;
            
            if (!uploadedFile || (!uploadedFile.path && !uploadedFile[0]?.path)) {
                console.error('Upload failed: No file or path returned', uploadedFile);
                setError('Échec du téléchargement du CV. Veuillez réessayer.');
                return;
            }
            const filePath = uploadedFile.path || uploadedFile[0]?.path;

            setStatusText('Conversion en image...');
            const imageFile = await convertPdfToImage(file);
            if(!imageFile.file) {
                console.error('PDF Conversion error:', imageFile.error);
                setError(`Échec de la conversion du PDF en image. ${imageFile.error || ''}`);
                return;
            }

            setStatusText('Téléchargement de l\'image...');
            const uploadedImageResult = await fs.upload([imageFile.file]);
            console.log('Image upload result:', uploadedImageResult);
            const uploadedImage = Array.isArray(uploadedImageResult) ? uploadedImageResult[0] : uploadedImageResult;
            
            if(!uploadedImage || (!uploadedImage.path && !uploadedImage[0]?.path)) {
                console.error('Image upload failed', uploadedImage);
                setError('Échec du téléchargement de l\'image. Veuillez réessayer.');
                return;
            }
            const imagePath = uploadedImage.path || uploadedImage[0]?.path;

            setStatusText('Préparation des données...');
            const uuid = generateUUID();
            const data = {
                id: uuid,
                resumePath: filePath,
                imagePath: imagePath,
                companyName, jobTitle, jobDescription,
                feedback: '',
            }
            await kv.set(`resume:${uuid}`, JSON.stringify(data));

            setStatusText('Analyse en cours...');
            const feedback = await ai.feedback(
                filePath,
                prepareInstructions({ jobTitle, jobDescription })
            )
            
            if (!feedback) {
                console.error('AI Feedback failed: No response');
                setError('Échec de l\'analyse du CV. Le service d\'IA n\'a renvoyé aucune réponse.');
                return;
            }

            let feedbackText = typeof feedback.message.content === 'string'
                ? feedback.message.content
                : feedback.message.content[0].text;

            // Remove potential markdown code blocks
            feedbackText = feedbackText.replace(/```json\n?|```/g, '').trim();

            let parsedFeedback;
            try {
                parsedFeedback = JSON.parse(feedbackText);
            } catch (e) {
                // Second attempt: try to find anything between { and } if simple trim didn't work
                try {
                    const match = feedbackText.match(/\{[\s\S]*\}/);
                    if (match) {
                        parsedFeedback = JSON.parse(match[0]);
                    } else {
                        throw new Error('No JSON object found');
                    }
                } catch (innerError) {
                    console.error('Failed to parse AI feedback:', feedbackText);
                    setError('Échec de l\'analyse de la réponse de l\'IA. Le format n\'est peut-être pas celui attendu.');
                    return;
                }
            }

            data.feedback = parsedFeedback;
            await kv.set(`resume:${uuid}`, JSON.stringify(data));
            setStatusText('Analyse terminée, redirection...');
            console.log('Final data:', data);
            navigate(`/resume/${uuid}`);
        } catch (error: any) {
            console.error('An unexpected error occurred during analysis:', error);
            const message = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
            setError(`Une erreur inattendue est survenue. ${message}`);
        } finally {
            setIsProcessing(false);
        }

    }


    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        console.log('Form submitted');
        const form = e.currentTarget.closest('form');
        if(!form) {
            console.error('Form not found');
            return;
        }
        const formData = new FormData(form);

        const companyName = formData.get('company-name') as string;
        const jobTitle = formData.get('job-title') as string;
        const jobDescription = formData.get('job-description') as string;

        console.log('Form data:', { companyName, jobTitle, jobDescription });

        if(!file) {
            console.warn('No file selected');
            alert('Please select a file first.');
            return;
        }

        handleAnalyze({ companyName, jobTitle, jobDescription, file });

    }

    const handleFileSelect = (file: File | null) => {
        setFile(file)
    }

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

    return (
        <main className={"bg-[url('/images/bg-main.svg')]bg-cover"}>
            <Navbar />
            <section className="main-section">
                <div className="page-heading py-16">
                    <h1>Des retours intelligents pour le job de vos rêves</h1>
                    {isProcessing ? (
                        <>
                            <h2>{statusText}</h2>
                            <img src="/images/resume-scan.gif" className="w-full" />
                        </>
                    ) : (
                        <h2>Déposez votre CV pour obtenir un score ATS et des conseils d'amélioration</h2>
                    )}

                    {!isProcessing && (
                        <form id="upload-form" onSubmit={handleSubmit} className="flex flex-col gap-4 mt-8">
                            {error && (
                                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                                    <strong className="font-bold">Erreur ! </strong>
                                    <span className="block sm:inline">{error}</span>
                                </div>
                            )}
                            <div className="form-div">
                                <label htmlFor="company-name">Nom de l'entreprise</label>
                                <input 
                                    type="text" 
                                    name="company-name" 
                                    placeholder="Nom de l'entreprise" 
                                    id="company-name" 
                                    defaultValue={formData.companyName}
                                />
                            </div>
                            <div className="form-div">
                                <label htmlFor="job-title">Titre du poste</label>
                                <input 
                                    type="text" 
                                    name="job-title" 
                                    placeholder="Titre du poste" 
                                    id="job-title" 
                                    defaultValue={formData.jobTitle}
                                />
                            </div>
                            <div className="form-div">
                                <label htmlFor="job-description">Description du poste</label>
                                <textarea 
                                    rows={5} 
                                    name="job-description" 
                                    placeholder="Description du poste" 
                                    id="job-description" 
                                    defaultValue={formData.jobDescription}
                                />
                            </div>

                            <div className="form-div">
                                <label htmlFor="uploader">Télécharger votre CV</label>
                                <FileUploader onFileSelect={handleFileSelect} />
                                </div>

                            <button className="primary-button" type="submit">
                                Analyser le CV
                            </button>
                        </form>
                    )}
                </div>
            </section>
        </main>
    )
}
export default Upload
