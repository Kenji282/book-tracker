# Paper Trails

Paper Trails is a responsive personal book tracker built with plain HTML, CSS, and JavaScript. It keeps your collection in your browser, so no account or server is required.

## Getting started

Open `index.html` in a modern web browser. The site does not require a build step or package installation.

## Features

- Add books with a title, author, reading status, optional description, and optional cover image.
- Choose a cover image from a direct image URL or upload one from your device.
- Edit book details and change a book's status; delete books from your shelf.
- Search by title or author as you type, with relevant matches prioritized.
- Sort by newest, title, or author, and filter by reading status.
- Browse in row or grid layout, with the selected layout remembered after refresh.
- View book details, including upload date and last edited date when available.
- See counts for to-read, currently-reading, and finished books.
- Browse results in pages of 20, with page controls at the top and bottom and a page-number jump.
- Switch between monochrome light and dark themes; the selected theme is remembered.
- Use the responsive layout on phone-sized screens.

## Browser storage

Books and display preferences are saved in browser `localStorage`. They remain available after a refresh in the same browser profile, but are not synced to other browsers or devices. Clearing the browser's site data removes the saved collection.

## Project files

- `index.html` — page structure and forms.
- `styles.css` — responsive layout and light/dark styling.
- `app.js` — book management, search, sorting, pagination, image handling, and browser storage.
- `PROMPTS.md` — the prompts used to shape the website.
