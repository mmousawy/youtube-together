import HostController from './HostController.js';
import GuestController from './GuestController.js';

(function() {
  // Load the YouTube iFrame API
  const scriptNode = document.createElement('script');
  scriptNode.src = '//www.youtube.com/iframe_api';
  document.body.appendChild(scriptNode);

  window.addEventListener('load', () => {
    (document.body || document.documentElement).classList.remove('is-loading');
  });

  /* Instantiate the YouTube Player and the controller
     once the iFrame API has been loaded */
  window.onYouTubeIframeAPIReady = () => {
    let socket;

    socket = new WebSocket('ws://127.0.0.1:8081');

    // Wrapper function to send JSON encoded data
    socket.sendJSON = rawPayload => socket.send(JSON.stringify(rawPayload));

    socket.addEventListener('open', () => {
      initialisePage();
    });

    const initialisePage = () => {
      let controller;

      const elements = {
        // Overlay
        overlay: document.querySelector('.overlay'),
        overlay__hostForm: document.querySelector('.overlay__host-form'),
        overlay__joinForm: document.querySelector('.overlay__join-form'),
        responseMessage: document.querySelector('.overlay__response-message'),
        button__host: document.querySelector('.button--host'),
        button__join: document.querySelector('.button--join'),
        input__roomCode: document.querySelector('.input--join'),
        input__videoId: document.querySelector('.input--video-id'),
        // Seekbar
        seekbar: document.querySelector('.seekbar'),
        seekbar__track: document.querySelector('.seekbar__track'),
        seekbar__progress: document.querySelector('.seekbar__progress'),
        seekbar__thumb: document.querySelector('.seekbar__thumb'),
        // Controls
        player__roomCode: document.querySelector('.player__room-code'),
        button__play: document.querySelector('.controls__button--play'),
        button__volume: document.querySelector('.controls__button--volume'),
        button__leave: document.querySelector('.button--leave'),
        controls__time: document.querySelector('.controls__time')
      };

      elements.overlay__hostForm.addEventListener('submit', event => {
        event.preventDefault();
        return false;
      });

      elements.overlay__joinForm.addEventListener('submit', event => {
        event.preventDefault();
        return false;
      });

      // Play/pause
      elements.button__play.addEventListener('click', event => {
        if (controller.isGuest) {
          return;
        }

        if (controller.playBackState === 0) {
          elements.button__play.classList.add('controls__button--is-playing');
          controller.playBackState = 1;
          controller.player.playVideo();
          return;
        }

        elements.button__play.classList.remove('controls__button--is-playing');
        controller.playBackState = 0;
        controller.player.pauseVideo();
      });

      // Seek
      elements.seekbar.addEventListener('mousedown', event => {
        if (controller.isGuest) {
          return;
        }

        controller.isSeeking = true;

        elements.seekbar.classList.add('is-seeking');

        window.addEventListener('mousemove', updateSeekbar);

        updateSeekbar(event);
      });

      const updateSeekbar = (event) => {
        if (!event || !event.clientX) {
          return;
        }

        const seekbarPosition = elements.seekbar.getBoundingClientRect();
        const trackPosition = elements.seekbar__track.getBoundingClientRect();
        let position = Math.round(
          event.clientX - seekbarPosition.left + (seekbarPosition.left - trackPosition.left)
        );

        position = (position < 0 ? 0 : (position > trackPosition.width ? trackPosition.width : position));

        const positionRatio = position / trackPosition.width;
        const positionPercentage = positionRatio * 100;

        elements.seekbar__progress.style.width = positionPercentage + '%';
        elements.seekbar__thumb.style.left = position + elements.seekbar__thumb.offsetWidth * .5 + 'px';

        controller.seekPositionRatio = positionRatio;
        controller.trackPosition = trackPosition;
        controller.seekPositionTime = positionRatio * controller.videoDuration;

        controller.updateTime.bind(controller, controller.seekPositionTime)();
      }

      // Seek
      window.addEventListener('mouseup', event => {
        if (!controller
          || controller.isGuest
          || !controller.isSeeking) {
          return;
        }
        elements.seekbar.classList.remove('is-seeking');

        controller.player.seekTo(controller.seekPositionTime, true);

        controller.socket.sendJSON({
          header: {
            action: 'updateState'
          },
          body: {
            state: controller.player.getPlayerState(),
            time: controller.seekPositionTime,
            timestamp: new Date().getTime()
          }
        })

        window.removeEventListener('mousemove', updateSeekbar);

        controller.isSeeking = false;
      });

      // Host a room
      elements.button__host.addEventListener('click', event => {
        const videoId = elements.input__videoId.value;

        if (videoId.length !== 11) {
          return;
        }

        elements.overlay.classList.add('is-loading');
        elements.responseMessage.textContent = '';

        controller = new HostController(elements, socket, videoId);
      });

      // Join a room
      elements.button__join.addEventListener('click', event => {
        const roomCode = elements.input__roomCode.value;

        if (roomCode.length < 7 || roomCode.length > 14) {
          return;
        }

        elements.overlay.classList.add('is-loading');

        elements.responseMessage.textContent = '';
        controller = new GuestController(elements, socket, roomCode);
      });

      // Leave current room
      elements.button__leave.addEventListener('click', event => {
        controller.socket.sendJSON({
          header: {
            action: 'leave'
          }
        });
      });
    };
  };
})();
