import { StateGraph, START, END } from '@langchain/langgraph';
import { WorkflowStateAnnotation } from './state.js';
import { validateRequestNode } from './nodes/validate-request.node.js';
import { generateConceptNode } from './nodes/generate-concept.node.js';
import { generateHooksNode } from './nodes/generate-hooks.node.js';
import { evaluateHooksNode } from './nodes/evaluate-hooks.node.js';
import { generateOutlineNode } from './nodes/generate-outline.node.js';
import { writeStoryNode } from './nodes/write-story.node.js';
import { evaluateStoryNode, shouldReviseRouter } from './nodes/evaluate-story.node.js';
import { reviseStoryNode } from './nodes/revise-story.node.js';
import { finalValidationNode } from './nodes/final-validation.node.js';
import { formatVoiceoverNode } from './nodes/format-voiceover.node.js';
// ---------------------------------------------------------------------------
// Compile the LangGraph workflow
// ---------------------------------------------------------------------------
export function buildStoryGraph() {
    const graph = new StateGraph(WorkflowStateAnnotation)
        // Register all nodes
        .addNode('validateRequest', validateRequestNode)
        .addNode('generateConcept', generateConceptNode)
        .addNode('generateHooks', generateHooksNode)
        .addNode('evaluateHooks', evaluateHooksNode)
        .addNode('generateOutline', generateOutlineNode)
        .addNode('writeStory', writeStoryNode)
        .addNode('evaluateStory', evaluateStoryNode)
        .addNode('reviseStory', reviseStoryNode)
        .addNode('finalValidation', finalValidationNode)
        .addNode('formatVoiceover', formatVoiceoverNode)
        // Linear edges (no branching)
        .addEdge(START, 'validateRequest')
        .addEdge('validateRequest', 'generateConcept')
        .addEdge('generateConcept', 'generateHooks')
        .addEdge('generateHooks', 'evaluateHooks')
        .addEdge('evaluateHooks', 'generateOutline')
        .addEdge('generateOutline', 'writeStory')
        .addEdge('writeStory', 'evaluateStory')
        // Conditional routing after evaluation
        .addConditionalEdges('evaluateStory', shouldReviseRouter, {
        reviseStory: 'reviseStory',
        finalValidation: 'finalValidation',
    })
        // After revision, evaluate again (bounded by revisionCount check in router)
        .addEdge('reviseStory', 'evaluateStory')
        // Final path
        .addEdge('finalValidation', 'formatVoiceover')
        .addEdge('formatVoiceover', END);
    return graph.compile();
}
// Singleton compiled graph
let _graph = null;
export function getStoryGraph() {
    if (!_graph)
        _graph = buildStoryGraph();
    return _graph;
}
//# sourceMappingURL=graph.js.map