
const THREE = require('three'); // older modules are imported like this. You shouldn't have to worry about this much
import Framework from './framework'
import State from './state.js'

//sound
var listener = new THREE.AudioListener();
var audioLoader = new THREE.AudioLoader();

var instruments = new Array();
//var instrumentNames = ['piano', 'clarinet', 'cello', 'french-horn'];
var instrumentNames = ['piano'];

// index = 40 because instruments[X][40] is middle C
var index = 40; 
var length = 84;
var prevTime = Date.now();

// time interval between notes, in milliseconds
var baseTimeInterval = 200; // time for a whole note

// see image of electronic keyboard to understand indexing:
// https://images-na.ssl-images-amazon.com/images/I/81uw9BUrzTL._SL1500_.jpg
// A0, Bb0, B0, C1, Db1, D1, ... Bb7, B7, C8
var notes = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
var fileLoadCount = 0;

var state = new State(40, 5, 0, 84);

// keeps track of which notes to play next
var harmonyQueue = [];
var melodyQueue = [];


// generates notes for one KEY, for a random number of measures
// then passes it on to another KEY
function generateMelody()
{
  var output;
  if (state.degree == 0 && Math.random() < 0.5) { output = state.doModulation(); } 
  else { output = state.doProgression(); }
  // transfer data to queues
  for (var i = 0; i < output[0].length; i++) { notesQueue.push(output[0][i]); }
  for (var i = 0; i < output[1].length; i++) { countQueue.push(output[1][i]); }
}

// called after the scene loads
function onLoad(framework) 
{
  var scene = framework.scene;
  var camera = framework.camera;
  var renderer = framework.renderer;
  var controls = framework.controls;
  //var gui = framework.gui;
  //var stats = framework.stats;


  for (var j = 0; j < instrumentNames.length; j++)
  {
    try { throw j }
    catch (instrument)
    {
      setTimeout(function()
      {
        instruments[instrument] = new Array();

        // load all the piano note mp3 files
        for (var i = 0; i < length; i++)
        {
          // we have to use a try catch statement for loading, or else i = (length - 1) for all
          // read more here:
          // https://dzone.com/articles/why-does-javascript-loop-only-use-last-value
          try { throw i }
          catch (note) 
          {
            setTimeout(function()
            {

              // we are skipping A0, Bb0, B0, and C8, Db8
              audioLoader.load( './sounds/' + instrumentNames[instrument] + '/' + notes[note % 12] + (Math.floor(note / 12) + 1) + '.mp3', function( buffer ) 
              {
                instruments[instrument][note] = new THREE.Audio(listener);
                instruments[instrument][note].name = notes[note % 12] + (Math.floor(note / 12) + 1);
                instruments[instrument][note].setBuffer( buffer );
                instruments[instrument][note].setVolume(1.0);
                fileLoadCount++;
              });

            }, 1000);
          }
        }

      }, 1000);
    }
  }

  var progression = state.doNewProgression(0, 2);
  for (var j = 0; j < progression.length; j++)
  {
    //state.doNewProgression(0, 8);
    var possibleNotes = state.doNewHarmony(progression[j]);
    var playedNotes = state.doNewRhythm(possibleNotes);
    for (var i = 0; i < playedNotes[0].length; i++)
    {
      harmonyQueue.push(playedNotes[0][i]);
    }
    for (var i = 0; i < playedNotes[1].length; i++)
    {
      melodyQueue.push(playedNotes[1][i]);
    }
  }

}

// called on frame updates
function onUpdate(framework) 
{
  
  // play notes next on notesQueue every time interval
  // double check all piano sounds loaded
  if (Math.abs(prevTime - Date.now()) >= baseTimeInterval && fileLoadCount >= length * instrumentNames.length)
  {
    if (harmonyQueue.length > 0 && melodyQueue.length > 0)
    {
      // get the harmony notes to play for this onUpdate step
      var notesAtOnce = harmonyQueue.shift();

      for (var i = 0; i < notesAtOnce.length; i++)
      {
        var noteIndex = notesAtOnce[i];

        if (noteIndex != -1)
        {
          // play same note on all instruments, must be inner loop
          for (var j = 0; j < instruments.length; j++)
          {
            // if the note is still playing, stop and play it again
            if (instruments[j][noteIndex].isPlaying) { instruments[j][noteIndex].stop(); }
            instruments[j][noteIndex].play();
          }
        }

      }

      // get the melody notes to play for this onUpdate step
      notesAtOnce = melodyQueue.shift();
      for (var i = 0; i < notesAtOnce.length; i++)
      {
        var noteIndex = notesAtOnce[i];

        if (noteIndex != -1)
        {
          // play same note on all instruments, must be inner loop
          for (var j = 0; j < instruments.length; j++)
          {
            // if the note is still playing, stop and play it again
            if (instruments[j][noteIndex].isPlaying) { instruments[j][noteIndex].stop(); }
            instruments[j][noteIndex].play();
          }
        }

      }

      // update time
      prevTime = Date.now();
    }
  }
  

}

// when the scene is done initializing, it will call onLoad, then on frame updates, call onUpdate
Framework.init(onLoad, onUpdate);
