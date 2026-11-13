import type { NodeTokenUsage } from '../../utils/token-usage.js';
export declare const WorkflowStateAnnotation: import("@langchain/langgraph").AnnotationRoot<{
    generationId: import("@langchain/langgraph").BinaryOperatorAggregate<string, string>;
    request: import("@langchain/langgraph").BinaryOperatorAggregate<{
        tense: "past" | "present" | "experimental";
        genre: "custom" | "mystery" | "psychological_thriller" | "horror" | "romance" | "fantasy" | "science_fiction" | "drama" | "adventure" | "crime" | "comedy" | "inspirational" | "historical_fiction";
        pov: "first_person" | "third_person_limited" | "third_person_omniscient" | "second_person";
        durationMinutes: number;
        narrationWordsPerMinute: number;
        mood: ("inspirational" | "dark" | "mysterious" | "romantic" | "emotional" | "sad" | "suspenseful" | "hopeful" | "peaceful" | "disturbing" | "funny" | "nostalgic" | "tense" | "eerie")[];
        hookStyle: "mysterious" | "emotional" | "shocking" | "question_based" | "impossible_situation" | "unexpected_consequence" | "dangerous_situation" | "intriguing_confession" | "dialogue_based" | "climax_first";
        endingStyle: "inspirational" | "dark" | "sad" | "happy" | "bittersweet" | "unexpected_twist" | "revelation" | "emotional_closure" | "thought_provoking" | "open_ended_but_satisfying";
        pacing: "fast" | "balanced" | "slow_burn" | "gradually_escalating";
        complexity: "simple" | "moderate" | "complex" | "nonlinear";
        dialogueIntensity: "balanced" | "narration_heavy" | "dialogue_heavy";
        narrativeStyle: "cinematic" | "conversational" | "documentary" | "personal_confession" | "literary" | "simple_direct";
        language: string;
        emotionalJourney?: "fear_to_relief" | "sadness_to_hope" | "curiosity_to_shock" | "love_to_sacrifice" | "confusion_to_understanding" | "happiness_to_tragedy" | "anger_to_redemption" | "loneliness_to_belonging" | "suspense_to_satisfaction" | undefined;
        audience?: string | undefined;
        theme?: string | undefined;
        customPremise?: string | undefined;
        protagonistDescription?: string | undefined;
        characterRelationships?: string | undefined;
        setting?: string | undefined;
        additionalInstructions?: string | undefined;
        contentPreferences?: {
            avoidViolence?: boolean | undefined;
            avoidProfanity?: boolean | undefined;
            avoidSexualContent?: boolean | undefined;
            additionalRestrictions?: string[] | undefined;
        } | undefined;
    }, {
        tense: "past" | "present" | "experimental";
        genre: "custom" | "mystery" | "psychological_thriller" | "horror" | "romance" | "fantasy" | "science_fiction" | "drama" | "adventure" | "crime" | "comedy" | "inspirational" | "historical_fiction";
        pov: "first_person" | "third_person_limited" | "third_person_omniscient" | "second_person";
        durationMinutes: number;
        narrationWordsPerMinute: number;
        mood: ("inspirational" | "dark" | "mysterious" | "romantic" | "emotional" | "sad" | "suspenseful" | "hopeful" | "peaceful" | "disturbing" | "funny" | "nostalgic" | "tense" | "eerie")[];
        hookStyle: "mysterious" | "emotional" | "shocking" | "question_based" | "impossible_situation" | "unexpected_consequence" | "dangerous_situation" | "intriguing_confession" | "dialogue_based" | "climax_first";
        endingStyle: "inspirational" | "dark" | "sad" | "happy" | "bittersweet" | "unexpected_twist" | "revelation" | "emotional_closure" | "thought_provoking" | "open_ended_but_satisfying";
        pacing: "fast" | "balanced" | "slow_burn" | "gradually_escalating";
        complexity: "simple" | "moderate" | "complex" | "nonlinear";
        dialogueIntensity: "balanced" | "narration_heavy" | "dialogue_heavy";
        narrativeStyle: "cinematic" | "conversational" | "documentary" | "personal_confession" | "literary" | "simple_direct";
        language: string;
        emotionalJourney?: "fear_to_relief" | "sadness_to_hope" | "curiosity_to_shock" | "love_to_sacrifice" | "confusion_to_understanding" | "happiness_to_tragedy" | "anger_to_redemption" | "loneliness_to_belonging" | "suspense_to_satisfaction" | undefined;
        audience?: string | undefined;
        theme?: string | undefined;
        customPremise?: string | undefined;
        protagonistDescription?: string | undefined;
        characterRelationships?: string | undefined;
        setting?: string | undefined;
        additionalInstructions?: string | undefined;
        contentPreferences?: {
            avoidViolence?: boolean | undefined;
            avoidProfanity?: boolean | undefined;
            avoidSexualContent?: boolean | undefined;
            additionalRestrictions?: string[] | undefined;
        } | undefined;
    }>;
    targetWordCount: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    minimumWords: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    maximumWords: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    storyConcept: import("@langchain/langgraph").BinaryOperatorAggregate<{
        emotionalJourney: string;
        setting: string;
        premise: string;
        protagonist: string;
        motivation: string;
        centralConflict: string;
        stakes: string;
        incitingIncident: string;
        majorRevelation: string;
        climaxDirection: string;
        endingDirection: string;
    } | null, {
        emotionalJourney: string;
        setting: string;
        premise: string;
        protagonist: string;
        motivation: string;
        centralConflict: string;
        stakes: string;
        incitingIncident: string;
        majorRevelation: string;
        climaxDirection: string;
        endingDirection: string;
    } | null>;
    hookCandidates: import("@langchain/langgraph").BinaryOperatorAggregate<{
        text: string;
        wordCount: number;
        style: string;
        questionRaised: string;
        hookType: string;
    }[], {
        text: string;
        wordCount: number;
        style: string;
        questionRaised: string;
        hookType: string;
    }[]>;
    selectedHook: import("@langchain/langgraph").BinaryOperatorAggregate<{
        text: string;
        wordCount: number;
        style: string;
        questionRaised: string;
        hookType: string;
    } | null, {
        text: string;
        wordCount: number;
        style: string;
        questionRaised: string;
        hookType: string;
    } | null>;
    hookEvaluation: import("@langchain/langgraph").BinaryOperatorAggregate<{
        scores: {
            curiosity: number;
            clarity: number;
            impact: number;
            relevance: number;
            promiseFulfillment: number;
            narrationQuality: number;
        };
        overallScore: number;
        selectedCandidateIndex: number;
        reasoning: string;
    } | null, {
        scores: {
            curiosity: number;
            clarity: number;
            impact: number;
            relevance: number;
            promiseFulfillment: number;
            narrationQuality: number;
        };
        overallScore: number;
        selectedCandidateIndex: number;
        reasoning: string;
    } | null>;
    storyOutline: import("@langchain/langgraph").BinaryOperatorAggregate<{
        totalWordBudget: number;
        beats: {
            description: string;
            beatNumber: number;
            title: string;
            purpose: string;
            wordBudget: number;
            key_moments: string[];
        }[];
        narrativeArc: string;
        paceNotes: string;
    } | null, {
        totalWordBudget: number;
        beats: {
            description: string;
            beatNumber: number;
            title: string;
            purpose: string;
            wordBudget: number;
            key_moments: string[];
        }[];
        narrativeArc: string;
        paceNotes: string;
    } | null>;
    draftTitle: import("@langchain/langgraph").BinaryOperatorAggregate<string, string>;
    draftScript: import("@langchain/langgraph").BinaryOperatorAggregate<string, string>;
    revisionCount: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    storyEvaluation: import("@langchain/langgraph").BinaryOperatorAggregate<{
        scores: {
            pacing: number;
            hook: number;
            engagement: number;
            characterDevelopment: number;
            coherence: number;
            emotionalImpact: number;
            climax: number;
            endingSatisfaction: number;
            voiceoverQuality: number;
            configurationAdherence: number;
        };
        overallScore: number;
        strengths: string[];
        weaknesses: string[];
        specificIssues: string[];
        requiredImprovements: string[];
        hookDelivered: boolean;
        approvalStatus: "APPROVED" | "NEEDS_REVISION" | "NEEDS_REVIEW";
        durationValidation: {
            wordCount: number;
            estimatedMinutes: number;
            withinBounds: boolean;
        };
    } | null, {
        scores: {
            pacing: number;
            hook: number;
            engagement: number;
            characterDevelopment: number;
            coherence: number;
            emotionalImpact: number;
            climax: number;
            endingSatisfaction: number;
            voiceoverQuality: number;
            configurationAdherence: number;
        };
        overallScore: number;
        strengths: string[];
        weaknesses: string[];
        specificIssues: string[];
        requiredImprovements: string[];
        hookDelivered: boolean;
        approvalStatus: "APPROVED" | "NEEDS_REVISION" | "NEEDS_REVIEW";
        durationValidation: {
            wordCount: number;
            estimatedMinutes: number;
            withinBounds: boolean;
        };
    } | null>;
    revisionFeedback: import("@langchain/langgraph").BinaryOperatorAggregate<string[], string[]>;
    finalTitle: import("@langchain/langgraph").BinaryOperatorAggregate<string, string>;
    finalScript: import("@langchain/langgraph").BinaryOperatorAggregate<string, string>;
    finalWordCount: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    finalDurationSeconds: import("@langchain/langgraph").BinaryOperatorAggregate<number, number>;
    approvalStatus: import("@langchain/langgraph").BinaryOperatorAggregate<"APPROVED" | "NEEDS_REVIEW", "APPROVED" | "NEEDS_REVIEW">;
    validationPassed: import("@langchain/langgraph").BinaryOperatorAggregate<boolean, boolean>;
    tokenUsage: import("@langchain/langgraph").BinaryOperatorAggregate<NodeTokenUsage[], NodeTokenUsage[]>;
    modelMetadata: import("@langchain/langgraph").BinaryOperatorAggregate<Record<string, unknown>, Record<string, unknown>>;
    error: import("@langchain/langgraph").BinaryOperatorAggregate<string | null, string | null>;
}>;
export type WorkflowState = typeof WorkflowStateAnnotation.State;
//# sourceMappingURL=state.d.ts.map