-   Fix paragraph breakup

Editing pipeline

-   Song
-   Intro
-   Outro
-   Transition

More voices support

## dsadsa

Nuvarande processen är:
ändra i serverkod,
starta om servern,
ladda om applikationen,
gå till delen där den ändrade delen används,
testa,
om det inte funkar, gå tillbaks till första steget.

Testing i detta fallet skulle öka hastigheten ofantligt.
Eller automatisering med Insomnia/API-klient

## TODO

Problem:

-   Sned text gick inte att klicka på
-   text som skulle visas i separata "kolumner" revealade del av den andra kolumnen
-   gifs
-   kunde inte dölja del av bilden, och sen visa i några sekunder som sista steg

-   Revamp the process into a pipeline, where every step is one of:

    -   TTS Read med auto-reveal
    -   TTS read utan reveal
    -   Show area
    -   Hide previously-set "blocking rectangle", revealing the content below
    -   Wait for a given time

-   Make requests replayable?
