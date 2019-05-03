
const THREE = require('three'); // older modules are imported like this. You shouldn't have to worry about this much
import Framework from './framework'
import State from './state.js'


var Sliders = function() {
    this.key = 40;
    this.mode = 0;
    this.bpm = 4;
    this.length = 2; // number of l-system iterations
    this.speed = 300; // time interval between 1/12 of a measure, in milliseconds
    this.progressionComplexity = 4; // average length of chord progression
    this.melodyFreq = 0.4;

    this.hPiano = true;
    this.hClarinet = false;
    this.hCello = false;
    this.hFrenchHorn = false;
    this.mPiano = true;
    this.mClarinet = false;
    this.mCello = false;
    this.mFrenchHorn = false;

    this.generate = function(){};
};
var sliders = new Sliders();


//sound
var listener = new THREE.AudioListener();
var audioLoader = new THREE.AudioLoader();

// instruments
var instruments = new Array();
var instrumentNames = ['piano', 'clarinet', 'cello', 'french-horn'];
var harmonyInstruments = [0]; // 0 is piano, 1 is clarinet, etc.
var melodyInstruments = [0]; // 0 is piano, 1 is clarinet, etc.

// keeps track of what audio files are playing so you can stop them
var harmonyCurrPlaying = [];
var melodyCurrPlaying = [];

// index = 40 because instruments[X][40] is middle C
var index = 40; 
var numNotes = 84;
var prevTime = Date.now();

// time interval between 1/12 of a measure, in milliseconds
var baseTimeInterval = 300;

// see image of electronic keyboard to understand indexing:
// https://images-na.ssl-images-amazon.com/images/I/81uw9BUrzTL._SL1500_.jpg
// A0, Bb0, B0, C1, Db1, D1, ... Bb7, B7, C8
var notes = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
var fileLoadCount = 0;

var state = new State(40, 0, 84, 4);

// keeps track of which notes to play next
var harmonyQueue = [];
var melodyQueue = [];


function resetState()
{
  state = new State(Number(sliders.key), Number(sliders.mode), 84, Number(sliders.bpm));
  harmonyQueue.length = 0;
  melodyQueue.length = 0;
  baseTimeInterval = sliders.speed;
  
  harmonyInstruments.length = 0;
  if (sliders.hPiano) { harmonyInstruments.push(0); }
  if (sliders.hClarinet) { harmonyInstruments.push(1); }
  if (sliders.hCello) { harmonyInstruments.push(2); }
  if (sliders.hFrenchHorn) { harmonyInstruments.push(3); }

  melodyInstruments.length = 0;
  if (sliders.mPiano) { melodyInstruments.push(0); }
  if (sliders.mClarinet) { melodyInstruments.push(1); }
  if (sliders.mCello) { melodyInstruments.push(2); }
  if (sliders.mFrenchHorn) { melodyInstruments.push(3); }

  harmonyCurrPlaying.length = 0;
  melodyCurrPlaying.length = 0;
}

// MAIN FUNCTION
// generates piece given slider parameters
function generatePiece()
{
  resetState();

  var lSystem = state.doNewLSystem(Number(sliders.length)).slice(0);
  var letterToNotes = [];
  for (var i = 0; i < lSystem.length; i++)
  {
    if (typeof letterToNotes[lSystem[i]] === 'undefined')
    {

      var progression = state.doNewProgression(0, Math.ceil(Math.random()*Number(sliders.progressionComplexity)));
      var harmonyNotes = [];
      var melodyNotes = [];
      for (var j = 0; j < progression.length; j++)
      {
        var possibleNotes = state.doNewHarmony(progression[j]);
        var playedNotes = state.doNewRhythm(possibleNotes, sliders.melodyFreq);
        harmonyNotes.push.apply(harmonyNotes, playedNotes[0]);
        melodyNotes.push.apply(melodyNotes, playedNotes[1]);
      }

      letterToNotes[lSystem[i]] = [harmonyNotes, melodyNotes];

      harmonyQueue.push.apply(harmonyQueue, harmonyNotes);
      melodyQueue.push.apply(melodyQueue, melodyNotes);
    }
    else
    {
      harmonyQueue.push.apply(harmonyQueue, letterToNotes[lSystem[i]][0]);
      melodyQueue.push.apply(melodyQueue, letterToNotes[lSystem[i]][1]);
    }
  }
}

// called after the scene loads
function onLoad(framework) 
{
  var scene = framework.scene;
  var camera = framework.camera;
  var renderer = framework.renderer;
  var controls = framework.controls;
  var gui = framework.gui;
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
        for (var i = 0; i < numNotes; i++)
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


  generatePiece();


  // edit params and listen to changes like this
  // more information here: https://workshop.chromeexperiments.com/examples/gui/#1--Basic-Usage
  gui.width = 400;
  gui.add(sliders, 'key', { C:40, D:41, E:42, F:43, G:37, A:38, B:39 } ).name("Key");
  gui.add(sliders, 'mode', { Ionian:0, Dorian:1, Phrygian:2, Lydian:3, Mixolydian:4, Aeolian:5, Locrian:6 } ).name("Mode");
  gui.add(sliders, 'bpm', { 2:2, 3:3, 4:4, 6:6, 12:12 } ).name("Beats Per Measure");
  gui.add(sliders, 'length', { Short:1, Medium:2, Long:3 } ).name("Length");
  gui.add(sliders, 'speed', 200.0, 600.0).step(50.0).name("Speed");
  gui.add(sliders, 'progressionComplexity', 1.0, 12.0).step(1.0).name("Progression Complexity");
  gui.add(sliders, 'melodyFreq', 0.0, 1.0).step(0.05).name("Melody Frequency");

  var f1 = gui.addFolder('Harmony Instruments');
  f1.add(sliders, 'hPiano').name("Piano");
  f1.add(sliders, 'hClarinet').name("Clarinet");
  f1.add(sliders, 'hCello').name("Cello");
  f1.add(sliders, 'hFrenchHorn').name("French Horn");

  var f2 = gui.addFolder('Melody Instruments');
  f2.add(sliders, 'mPiano').name("Piano");
  f2.add(sliders, 'mClarinet').name("Clarinet");
  f2.add(sliders, 'mCello').name("Cello");
  f2.add(sliders, 'mFrenchHorn').name("French Horn");

  gui.add(sliders, 'generate').name("Generate Piece").onFinishChange(function(newVal) { generatePiece(); });

}


// called on frame updates
function onUpdate(framework) 
{
  
  // play notes next on harmonyQueue and melodyQueue every time interval
  // double check all piano sounds loaded
  if (Math.abs(prevTime - Date.now()) >= baseTimeInterval && fileLoadCount >= numNotes * instrumentNames.length)
  {
    if (harmonyQueue.length > 0 && melodyQueue.length > 0)
    {

      // get the harmony notes to play for this onUpdate step
      var harmonyNotesAtOnce = harmonyQueue.shift();
      // get the melody notes to play for this onUpdate step
      var melodyNotesAtOnce = melodyQueue.shift();


      // stop playing harmony notes if new notes are going to be played
      // prevent mp3 overlap
      if (harmonyNotesAtOnce[0] != -1)
      {
        for (var i = 0; i < harmonyCurrPlaying.length; i++)
        {
          harmonyCurrPlaying[i].stop();
        }
        harmonyCurrPlaying = [];
      }

      // stop playing melody notes if new notes are going to be played
      // prevent mp3 overlap
      if (melodyNotesAtOnce[0] != -1)
      {
        for (var i = 0; i < melodyCurrPlaying.length; i++)
        {
          melodyCurrPlaying[i].stop();
        }
        melodyCurrPlaying = [];
      }


      // play harmony notes
      for (var i = 0; i < harmonyNotesAtOnce.length; i++)
      {
        var noteIndex = harmonyNotesAtOnce[i];

        if (noteIndex != -1 && noteIndex < numNotes)
        {
          // iterate through all instruments, must be inner loop
          for (var j = 0; j < instruments.length; j++)
          {
            if (harmonyInstruments.includes(j))
            {
              // if the note is still playing, stop and play it again
              if (instruments[j][noteIndex].isPlaying) { instruments[j][noteIndex].stop(); }
              instruments[j][noteIndex].play();
              //harmonyCurrPlaying.push(instruments[j][noteIndex]);
            }
          }
        }

      }

      // play melody notes 
      for (var i = 0; i < melodyNotesAtOnce.length; i++)
      {
        var noteIndex = melodyNotesAtOnce[i];

        if (noteIndex != -1 && noteIndex < numNotes)
        {
          // play same note on all instruments, must be inner loop
          for (var j = 0; j < instruments.length; j++)
          {
            if (melodyInstruments.includes(j))
            {
              // if the note is still playing, stop and play it again
              if (instruments[j][noteIndex].isPlaying) { instruments[j][noteIndex].stop(); }
              instruments[j][noteIndex].play();
              //melodyCurrPlaying.push(instruments[j][noteIndex]);
            }
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
