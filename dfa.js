// State Class, Defines DFA state with:
//  - Internal ID (For Printing and Debugging Purposes)
//  - Name
//  - Whether State is Accepting
//  - x and y coordinates of state center
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
// - toState and fromState arrow transitions between
// - Characters using transition
// - x and y coordinates of middle point of Arrow to define arc between
//     the states it transitions between
class Arrow {
    constructor(toState, fromState, chars=[], x=0, y=0) {
        this.toState = toState;
        this.fromState = fromState;
        this.chars = chars;
        this.x = x;
        this.y = y;
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

    // Return Whether the DFA is valid, i.e:
    //  - Has a Starting State
    //  - No Empty Transitions
    //  - No two transitions with same character from same state (IMPLEMENT!)
    isValid() {
        if (this.startingState === undefined) return false;
        for (const fromState of this.states) {
            for (const toState of this.states) {
                if (this.arrows.get(fromState).has(toState)
                 && this.arrows.get(fromState).get(toState).chars.length === 0) {
                    return false;
                 }
            }
        }
        return true;
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
        else {
            this.startingState = undefined;
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
    createTransition(fromState, toState, x=0, y=0) {
        if (!(this.states.has(fromState) && this.states.has(toState))) {
            return;
        }
        if (!this.arrows.get(fromState).has(toState)) {
            this.arrows.get(fromState).set(toState, 
                            new Arrow(fromState, toState, [], x, y));
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
    deleteTransition(arrow) {
        const [fromState, toState] = [arrow.toState, arrow.fromState];
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
        const arrowsFrom = this.arrows.get(fromState);
        for (const toState of this.states) {
            const arrow = arrowsFrom.get(toState);
            if (arrow !== undefined && arrow.chars.includes(character)) {
                return toState;
            }
        }
        return undefined;
    }

    // Given input to the DFA, returns states accessed and whether DFA accepts,
    // Or undefined if the DFA itself is invalid
    evaluate(input) {
        if (!this.isValid()) return undefined;
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