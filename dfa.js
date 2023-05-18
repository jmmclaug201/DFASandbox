// State Class, Defines DFA state with:
//  - Internal ID (For Printing and Debugging Purposes)
//  - Name
//  - Whether State is Accepting
class State {
    constructor(id, name, accepting, x=0, y=0) {
        // DFA related Values
        this.id = id;
        this.name = name;
        this.accepting = accepting;

        // Rendering related Values
        this.x = x;
        this.y = y;
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
//  - Set of States
//  - Next id to give a state upon creation
//  - Starting State 
//  - Arrows in Transition Function
class DFA {
    constructor() {
        this.states = new Set();
        this.nextId = 0;
        this.startingState = undefined;

        this.arrows = new WeakMap(); // convert to weakmap
    }

    // Create new state
    createState(name, accepting, x=0, y=0) {
        let state = new State(this.nextId, name, accepting, x, y);
        this.states.add(state);
        this.arrows.set(state, new WeakMap());
        this.nextId += 1;

        return state;
    }

    // Set DFA Starting State, if state exists in DFA
    setStartingState(state) {
        if (this.states.has(state)) {
            this.startingState = state;
        }
    }

    // Turns Accepting State into Rejecting State, and vice versa
    toggleStateAccepting(state) {
        state.accepting = !state.accepting;
        return state.accepting;
    }

    // Deletes state and all arrows incident on it from DFA
    deleteState(state) {
        this.states.delete(state);
        this.arrows.delete(state);
        for (const from in this.states) {
            this.arrows.get(from).delete(state);
        }
        if (this.startingState === state) {
            this.startingState = undefined;
        }
    }

    // Creates Transition from fromState to toState with no characters
    createTransition(fromState, toState) {
        if (!(this.states.has(fromState) && this.states.has(toState))) {
            return;
        }
        if (!this.arrows.get(fromState).has(toState)) {
            this.arrows.get(fromState).set(toState, new Arrow());
        }
    }

    // Gets Arrow from fromState to toState, if it exists
    getTransition(fromState, toState) {
        if (this.arrows.get(fromState).has(toState)) {
            return this.arrows.get(fromState).get(toState);
        }
        return undefined;
    }

    // Updates Characters applicable to given transition
    updateTransition(fromState, toState, characters) {
        if (!(this.states.has(fromState) && this.states.has(toState))) {
            return;
        }
        this.arrows.get(fromState).get(toState).chars = characters;
        return;
    }

    // Deletes Transition from fromState to toState, if one exists
    deleteTransition(fromState, toState) {
        if (!(this.states.has(fromState) && this.states.has(toState))) {
            return;
        }
        this.arrows.get(fromState).delete(toState);
    }

    // Given current state and next input character,
    // Returns next state, or undefined if no applicable transition defined
    step(fromState, character) {
        if (!this.states.has(fromState)) {
            return undefined;
        }
        // CONVERT FROM HERE DOWN TO WEAKMAP!!!
        const arrowsFrom = this.arrows.get(fromState);
        for (const toState in this.states) {
            const arrow = arrowsFrom.get(toState);
            if (arrow !== undefined && arrow.chars.includes(character)) {
                return toState
            }
        }
        return undefined;
    }

    // Given input to the DFA, returns ending state and whether DFA accepts
    evaluate(input) {
        let states = [this.startingState];
        for (const character of input) {
            if (states[states.length-1] === undefined){
                // Reached Invalid State
                break;
            }
            // Take Step Through DFA
            states.push(this.step(states[states.length-1], character));
        }

        let accepting;
        if (states[states.length-1] !== undefined) {
            accepting = states[states.length-1].accepting;
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

    // Prints String Representation of DFA (For Debugging Purposes)
    toString() {
        let stateString = "\n";
        for(const state of this.states) {
            stateString += `\t${state.id} (\"${state.name}\")\n`;
        }

        let startingStateString = 
            (this.startingState === undefined ? "None" : this.startingState.id);

        let transString = "\n";
        for (const from of this.states) {
            const arrowsFrom = this.arrows.get(from);
            for (const to of this.states) {
                if (arrowsFrom.has(to)) {
                    const chars = arrowsFrom.get(to).chars.toString();
                    transString += `\t${from.id} --[${chars}]-> ${to.id}\n`;
                }
            }
        }

        return `States: ${stateString}\n` 
             + `Starting State: ${startingStateString}\n`
             + `Transitions: ${transString}`;
    }
}