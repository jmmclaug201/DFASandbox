// State Class, Defines DFA state with:
//  - Internal ID
//  - Name
//  - Whether State is Accepting
class State {
    constructor(id, name, accepting) {
        this.id = id;
        this.name = name;
        this.accepting = accepting;
    }
}

// Arrow Class, Defines DFA arrow with:
// - Characters using transition
class Arrow {
    constructor(chars=[]) {
        this.chars = chars;
    }
}

// DFA Class, Defines DFA with:
//  - Object of id:state mappings
//  - Next id to give a state upon creation
//  = Object representing transition function
//  - Starting State 
//  - Arrows in Transition Function
class DFA {
    constructor() {
        this.states = {};
        this.stateId = 0;
        this.startingState = -1;

        this.arrows = {};
    }

    // Create new state with Unique id
    createState(name, accepting) {
        const stateId = this.stateId;

        let state = new State(stateId, name, accepting);
        this.states[stateId] = state;
        this.arrows[stateId] = {};

        this.stateId += 1;

        return state;
    }

    // Get State Using ID, if one exists with specified ID
    getState(id) {
        return this.states[id];
    }

    // Set DFA Starting State, if state exists with specified ID
    setStartingState(id) {
        if (id in this.states) {
            this.startingState = id;
        }
    }

    // Turns Accepting State into Rejecting State, and vice versa
    toggleStateAccepting(id) {
        const state = this.getState(id);
        state.accepting = !state.accepting;
        return state.accepting;
    }

    // Deletes state from DFA
    deleteState(id) {
        delete this.states[id];
        delete this.arrows[id];
        for (const fromId in this.arrows) {
            delete this.arrows[fromId][id];
        }
        if (this.startingState === id) {
            this.startingState = -1;
        }
    }

    // Creates Transition from fromId to toId
    createTransition(fromId, toId) {
        const fromState = this.getState(fromId);
        const toState = this.getState(toId);
        if (fromState === undefined || toState === undefined) {
            return;
        }
        if (this.arrows[fromId][toId] === undefined) {
            this.arrows[fromId][toId] = new Arrow();
        }
    }

    // Gets ID of state using Transition from fromId with character
    getTransition(fromId, character) {
        const arrowsFrom = this.arrows[fromId];
        if (arrowsFrom === undefined) {
            return -1;
        }
        for (const toId in arrowsFrom) {
            if (arrowsFrom[toId].chars.includes(character)) {
                return parseInt(toId);
            }
        }
        return -1;
    }

    // Updates Characters applicable to given transition
    updateTransition(fromId, toId, characters) {
        if (this.states[fromId] === undefined) {
            return;
        }
        if (this.states[toId] === undefined) {
            return;
        }
        this.arrows[fromId][toId].chars = characters;
        return;
    }

    deleteTransition(fromId, toId) {
        if (this.states[fromId] === undefined) {
            return;
        }
        if (this.states[toId] === undefined) {
            return;
        }
        delete this.arrows[fromId][toId];
    }

    // Given id of currentState and next input character,
    // Returns id of nextState, or -1 if no applicable transition defined
    step(fromId, character) {
        return this.getTransition(fromId, character);
    }

    // Given DFA input, returns ending stateId and whether DFA accepts
    evaluate(input) {
        let states = [this.startingState];
        for (const character of input) {
            if (states[states.length-1] === -1){
                // Reached Invalid State
                return {
                    states: states,
                    accepts: false,
                };
            }
            // Take Step Through DFA
            states.push(this.step(states[states.length-1], character));
        }

        let accepting;
        if (states[states.length-1] !== -1) {
            accepting = this.getState(states[states.length-1]).accepting;
        }
        else{
            accepting = false;
        }
        // Return Resulting States and Final Accepting Result
        return {
            states: states,
            accepts: accepting,
        }
    }

    toString() {
        let states = Object.keys(this.states);
        let stateString = states.join(",");

        let transitionString = "";
        for(const fromId in this.arrows) {
            for (const toId in this.arrows[fromId]) {
                const chars = this.arrows[fromId][toId].chars.toString();
                transitionString += `\t${fromId} --[${chars}]-> ${toId}\n`;
            }
        }

        return `States: ${stateString}\n` 
             + `Starting State: ${this.startingState}\n`
             + `Transitions:\n`
             + `${transitionString}`;
    }
}