let animation;
let quads;


fetch('../data/animData.json')
        .then( res => res.json())
        .then( data => {
            setVariablesFromData(data);
        });