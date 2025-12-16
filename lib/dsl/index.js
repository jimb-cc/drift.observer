/**
 * Narrative DSL
 *
 * Core modules for parsing and executing the drift.observer
 * narrative scripting language.
 */

const { parseDSL, validateAST, NodeType, ParseError } = require('./parser');
const { NarrativeRuntime, createGameState } = require('./runtime');
const { createEvaluator, createMockEvaluator } = require('./evaluator');

module.exports = {
    // Parser
    parseDSL,
    validateAST,
    ParseError,
    NodeType,

    // Runtime
    NarrativeRuntime,
    createGameState,

    // Evaluator
    createEvaluator,
    createMockEvaluator,
};
