let animation;
let quads;
let eyes = [];

fetch('../data/animData.json')
        .then( res => res.json())
        .then( data => {
            animation = data.animation;
            quads = data.quads;
            let anims = Object.keys(animation)
            anims.forEach( anim => {
                animation[anim].frames.forEach( frame =>{
                    frame.q.forEach( quad => {
                        if(quad.quadType == "eye"){
                            eyes.push(quads[quad.quadType][quad.quadIndex]);
                        }
                    })
                })
            });
        });