# Stereotropes

Some of the greatest reflections on society take place in film, through complex characters, often falling into familiar patterns called “Tropes”. Tropes are devices and conventions that a writer can rely on as being present in the audience’s minds. Stereotropes is an interactive experiment, exploring a set of tropes authored by the community on tvtropes.org that are categorized as being always female or always male.

In this repository you will find the application that currently runs on http://stereotropes.bocoup.com.

To read more about this project, see our [about](http://stereotropes.bocoup.com/about) page.

## Set up

1. Clone this repository
2. Set up dependencies

  `npm install`
  
  (this will run `npm install` and `bower install` subsequently.)

3. Stereotropes relies on a lot of data to run. From dictionaries of tropes and films
to detailed information about them. All the data lives in a separate repository
that is inaccessible. Instead, there is a public version of this repository that
you can check out into your `assets/data/` folder here: https://github.com/bocoup/stereotropes-data-public

  ```
  cd assets/data/
  git clone https://github.com/bocoup/stereotropes-data-public .
  ```

## Contributing

#### Submit an issue

If you experience any issues on Stereotropes, please consider submitting an issue for us.
Any screenshots, details about your browser and operating system and what you were doing
at the time are incredibly valuable for us. We need all the information we can get to
replicate the issue and fix it.

#### Submit fixes

If you'd like to submit fixes to Stereotropes, please make them as pull requests
from a fork.

## Running a local copy

You can run a development version of the application by calling:

`grunt dev`

This will start a local server on `http://localhost:8081`.
When you make changes, the application will automatically refresh (by using livereload).

To see a production compiled version of stereotropes, you can run:

`grunt public`

## Contact

For any questions, please email stereotropes@bocoup.com.


