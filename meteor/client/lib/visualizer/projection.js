import {
    displayError
} from "../editor/feedback"

currentlyProjectedTypes = [];
currentFramePosition = {};
allAtoms = [];
atomPositions = {};

project = function() {
    console.log(currentFramePosition)
    Meteor.call("getProjection", getCurrentInstance().sessionId, currentFramePosition, instanceIndex, processProjection);
};

processProjection = function(err, projection) {
    if (err) return displayError(err)
    else updateProjection(projection[0]);
};

updateProjection = function(frame) {
    cy.nodes().remove();
    allAtoms.forEach((node) => {
        for (const i in frame.atoms) {
            if (node.data().id == frame.atoms[i]) {
                // para cada atom, vemos se temos relations no vetor atom_rels
                // da projecao (frame)
                for (let ar = 0; ar < frame.atom_rels.length; ar++) {
                    if (frame.atom_rels[ar].atom == node.data().id) {
                        // create the array, or replace by empty
                        node.data().subsetSigs = [];
                        // este atom tem relations
                        // acrescentam todas aos subsetSigs para que o modulo
                        // do grafo as inclua abaixo do nome do atomo
                        for (let r = 0; r < frame.atom_rels[ar].relations.length; r++) {
                            node.data().subsetSigs.push(frame.atom_rels[ar].relations[r]);
                        }
                        break;
                    }
                }
                cy.add(node);
            }
        }
    });
    const edges = getProjectionEdges(frame.relations);
    cy.edges().remove();
    cy.add(edges);
    applyCurrentLayout();
    applyPositions();
};

addTypeToProjection = function(newType) {
    console.log("adding "+newType)
    const atoms = lastFrame(newType);
    if (currentlyProjectedTypes.indexOf(newType) == -1) {
        currentlyProjectedTypes.push(newType);
        currentlyProjectedTypes.sort();
        $('.frame-navigation').show();
        $('.frame-navigation > select').append($('<option></option>')
            .attr('value', newType)
            .text(newType));
        if (atoms >= 0) 
            currentFramePosition[newType] = 0;
    } else throw `${newType} already being projected.`;
    if (atoms >= 1)
        $('#nextFrame').addClass('enabled');
    else
        $('#nextFrame').removeClass('enabled');
    $('#previousFrame').removeClass('enabled');
    $('.current-frame').html(currentFramePositionToString());
    $('.framePickerTarget').val(newType);
    project();
};

removeTypeFromProjection = function(type) {
    const index = currentlyProjectedTypes.indexOf(type);
    if (index == -1) throw `${type} not found in types being projected.`;
    else {
        currentlyProjectedTypes.splice(index, 1);
        delete currentFramePosition[type];
        $(`.frame-navigation > select option[value = '${type}']`).remove();
    }
    if (currentlyProjectedTypes.length == 0) {
        $('.frame-navigation').hide();
        const instance = getCurrentInstance();
        if (instance) updateGraph(instance);
    } else {
        $('.current-frame').html(currentFramePositionToString());
        project();
    }
};

newInstanceSetup = function() {
    console.log(currentlyProjectedTypes)
    console.log(currentFramePosition)
    if (currentlyProjectedTypes.length != 0) {
        for (const key in currentlyProjectedTypes) 
            currentFramePosition[currentlyProjectedTypes[key]] = 0;
        $('.current-frame').html(currentFramePositionToString());
        allAtoms = cy.nodes();
        project();
        const atoms = lastFrame($('.framePickerTarget')[0].value);
        if (atoms >= 1) 
            $('#nextFrame').addClass('enabled');
        else 
            $('#nextFrame').removeClass('enabled');
        $('#previousFrame').removeClass('enabled');
    } else {
        $(".frame-navigation").hide();
    }
};

savePositions = function() {
    const atoms = cy.nodes();
    atoms.forEach((atom) => {
        atomPositions[atom.data().id] = jQuery.extend(true, {}, atom.position());
    });
};

applyPositions = function() {
    for (const id in atomPositions) {
        const node = cy.nodes(`[id='${id}']`);
        if (node.length > 0) {
            node[0].position(atomPositions[id]);
        }
    }
};

/*
 TODO caching system
 getProjectionFromCache = function (typesToProject){
 for(var i in projectionCache)
 if(projectionCache[i].projectedTypes.equals(typesToProject))return projectionCache[i].frames;
 return undefined;
 };

 cacheProjectionState = function(){

 };

 isProjectionCached = function (typesToProject){
 for(var i in projectionCache)
 if(projectionCache[i].projectedTypes.equals(typesToProject))return true;
 return false;
 }; */


getProjectionEdges = function(relations) {
    const result = [];
    relations.forEach((relation) => {
        if (relation.relation != 'Next' && relation.relation != 'First') {
            for (let i = 0; i < relation.tuples.length; i += relation.arity) {
                let tuple = [];
                for (let j = i; j < relation.arity + i; j++) tuple.push(relation.tuples[j]);
                const tempTuple = tuple.slice(0);
                const labelExt = tuple.splice(1, tuple.length - 2).toString();
                tuple = tempTuple;
                result.push({
                    group: 'edges',
                    selectable: true,
                    data: {
                        relation: relation.relation,
                        source: tuple[0],
                        target: tuple[tuple.length - 1],
                        label: getRelationLabel(relation.relation),
                        color: getRelationColor(relation.relation),
                        labelExt,
                        updatedLabelExt: labelExt,
                        edgeStyle: getRelationEdgeStyle(relation.relation),
                    },
                });
            }
        }
    });
    return result;
};


currentFramePositionToString = function() {
    const position = [];
    for (const key in currentFramePosition) position.push(key + currentFramePosition[key]);
    return position.toString();
};