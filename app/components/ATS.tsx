import React from 'react'

interface Suggestion {
    type: "good" | "improve";
    tip: string;
}

interface ATSProps {
    score: number;
    suggestions: Suggestion[];
}

const ATS: React.FC<ATSProps> = ({ score, suggestions }) => {
    // Determine background gradient based on score
    const gradientClass = score > 69
        ? 'from-green-100'
        : score > 49
            ? 'from-yellow-100'
            : 'from-red-100';

    // Determine icon based on score
    const iconSrc = score > 69
        ? '/icons/ats-good.svg'
        : score > 49
            ? '/icons/ats-warning.svg'
            : '/icons/ats-bad.svg';

    // Determine subtitle based on score
    const subtitle = score > 69
        ? 'Excellent travail !'
        : score > 49
            ? 'Bon début'
            : 'À améliorer';

    return (
        <div className={`bg-gradient-to-b ${gradientClass} to-white rounded-2xl shadow-md w-full p-6`}>
            {/* Top section with icon and headline */}
            <div className="flex items-center gap-4 mb-6">
                <img src={iconSrc} alt="ATS Score Icon" className="w-12 h-12" />
                <div>
                    <h2 className="text-2xl font-bold">Score ATS - {score}/100</h2>
                </div>
            </div>

            {/* Description section */}
            <div className="mb-6">
                <h3 className="text-xl font-semibold mb-2">{subtitle}</h3>
                <p className="text-gray-600 mb-4">
                    Ce score représente la probabilité que votre CV soit bien classé par les outils de gestion de candidatures (ATS) utilisés par les employeurs.
                </p>

                {/* Suggestions list */}
                <div className="space-y-3">
                    {suggestions.map((suggestion, index) => (
                        <div key={index} className="flex items-start gap-3">
                            <img
                                src={suggestion.type === "good" ? "/icons/check.svg" : "/icons/warning.svg"}
                                alt={suggestion.type === "good" ? "Check" : "Warning"}
                                className="w-5 h-5 mt-1"
                            />
                            <p className={suggestion.type === "good" ? "text-green-700" : "text-amber-700"}>
                                {suggestion.tip}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Closing encouragement */}
            <p className="text-gray-700 italic">
                Continuez à peaufiner votre CV pour améliorer vos chances de franchir les filtres ATS et d'arriver entre les mains des recruteurs.
            </p>
        </div>
    )
}

export default ATS
