import { type StoryConcept } from '../../schemas/concept.schema.js';
import type { WorkflowState } from '../state.js';
export declare function normalizeConceptObject(parsed: unknown): StoryConcept | null;
export declare function generateConceptNode(state: WorkflowState): Promise<Partial<WorkflowState>>;
//# sourceMappingURL=generate-concept.node.d.ts.map