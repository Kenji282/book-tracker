const STORAGE_KEY = "book-nook.books";
const VIEW_STORAGE_KEY = "book-nook.view";
const THEME_STORAGE_KEY = "book-nook.theme";
const VALID_STATUSES = new Set(["to-read", "reading", "finished"]);
const themeToggle = document.querySelector("#theme-toggle");
const themeColorMeta = document.querySelector('meta[name="theme-color"]');

const form = document.querySelector("#book-form");
const titleInput = document.querySelector("#book-title");
const authorInput = document.querySelector("#book-author");
const descriptionInput = document.querySelector("#book-description");
const statusInput = document.querySelector("#book-status");
const coverPicker = document.querySelector("#book-cover-picker");
const coverInput = coverPicker.querySelector(".cover-url");
const coverFileInput = coverPicker.querySelector(".cover-file");
const formMessage = document.querySelector("#form-message");
const searchInput = document.querySelector("#book-search");
const sortInput = document.querySelector("#book-sort");
const filterInput = document.querySelector("#book-filter");
const list = document.querySelector("#book-list");
const viewButtons = document.querySelectorAll(".view-button");
const emptyState = document.querySelector("#empty-state");
const storageError = document.querySelector("#storage-error");
const template = document.querySelector("#book-template");
const bookDialog = document.querySelector("#book-details");
const dialogCover = document.querySelector("#detail-cover");
const dialogCoverPlaceholder = document.querySelector("#detail-cover-placeholder");
const dialogTitle = document.querySelector("#detail-title");
const dialogAuthor = document.querySelector("#detail-author");
const dialogDescription = document.querySelector("#detail-description");
const dialogStatus = document.querySelector("#detail-status");
const dialogAdded = document.querySelector("#detail-added");
const dialogEditedRow = document.querySelector("#detail-edited-row");
const dialogEdited = document.querySelector("#detail-edited");
const dialogClose = bookDialog.querySelector(".dialog-close");
const paginationControls = document.querySelectorAll(".pagination");
const previousPageButtons = document.querySelectorAll('[data-page-action="previous"]');
const nextPageButtons = document.querySelectorAll('[data-page-action="next"]');
const pageSummaries = document.querySelectorAll(".page-summary");
const pageJumpForms = document.querySelectorAll("[data-page-jump]");
const pageInputs = document.querySelectorAll(".page-input");
const pagination = document.querySelector("#pagination");
const BOOKS_PER_PAGE = 20;

let books = loadBooks();
let currentPage = 1;
let bookView = loadBookView();
let theme = loadTheme();

function loadTheme() {
  try {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return savedTheme === "dark" || savedTheme === "light" ? savedTheme : "light";
  } catch (error) {
    console.error("Could not load the color theme preference:", error);
    return "light";
  }
}

function setTheme(nextTheme) {
  if (nextTheme !== "light" && nextTheme !== "dark") return;
  theme = nextTheme;
  document.body.dataset.theme = theme;
  themeColorMeta.content = theme === "dark" ? "#181818" : "#f4f4f2";
  themeToggle.setAttribute("aria-pressed", String(theme === "dark"));
  themeToggle.querySelector("span").textContent = theme === "dark" ? "Light mode" : "Dark mode";
  themeToggle.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} mode`);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    console.error("Could not save the color theme preference:", error);
    showStorageError("Your color theme preference couldn't be saved in this browser.");
  }
}

function loadBookView() {
  try {
    const savedView = window.localStorage.getItem(VIEW_STORAGE_KEY);
    return savedView === "grid" || savedView === "rows" ? savedView : "rows";
  } catch (error) {
    showStorageError("Your display preference couldn't be loaded from this browser.");
    console.error("Could not load the book display preference:", error);
    return "rows";
  }
}

function setBookView(view) {
  if (view !== "rows" && view !== "grid") return;
  bookView = view;
  list.dataset.view = view;
  viewButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.view === view));
  });
  try {
    window.localStorage.setItem(VIEW_STORAGE_KEY, view);
  } catch (error) {
    showStorageError("Your display preference couldn't be saved in this browser.");
    console.error("Could not save the book display preference:", error);
  }
}

function updateCoverPicker(picker) {
  const selectedMode = picker.querySelector('input[type="radio"]:checked').value;
  const urlChoice = picker.querySelector('[data-cover-choice="url"]');
  const deviceChoice = picker.querySelector('[data-cover-choice="device"]');

  urlChoice.hidden = selectedMode !== "url";
  deviceChoice.hidden = selectedMode !== "device";
}

function setupCoverPicker(picker, groupName, initialMode = "url") {
  const choices = picker.querySelectorAll('input[type="radio"]');

  choices.forEach((choice) => {
    choice.name = groupName;
    choice.checked = choice.value === initialMode;
    choice.addEventListener("change", () => updateCoverPicker(picker));
  });

  updateCoverPicker(picker);
}

function loadBooks() {
  try {
    const savedBooks = window.localStorage.getItem(STORAGE_KEY);
    if (!savedBooks) return [];

    const parsedBooks = JSON.parse(savedBooks);
    if (!Array.isArray(parsedBooks)) {
      throw new Error("Saved book data is not a list.");
    }

    return parsedBooks.filter((book) =>
      book
      && typeof book.id === "string"
      && typeof book.title === "string"
      && typeof book.author === "string"
      && VALID_STATUSES.has(book.status)
      && typeof book.createdAt === "number"
      && (book.description === undefined || typeof book.description === "string")
      && (book.updatedAt === undefined || typeof book.updatedAt === "number")
      && (book.cover === "" || typeof book.cover === "string")
    );
  } catch (error) {
    showStorageError("Your saved books couldn't be loaded. Browser storage may be unavailable or the saved data may be damaged.");
    console.error("Could not load saved books:", error);
    return [];
  }
}

function saveBooks() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
    storageError.hidden = true;
    return true;
  } catch (error) {
    showStorageError("Your changes couldn't be saved in this browser. Check that browser storage is enabled and has space.");
    console.error("Could not save books:", error);
    return false;
  }
}

function showStorageError(message) {
  storageError.textContent = message;
  storageError.hidden = false;
}

function readCoverFile(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const scale = Math.min(1, 600 / image.naturalWidth, 900 / image.naturalHeight);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");

      if (!context) {
        reject(new Error("This browser couldn't prepare the selected image."));
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("This browser couldn't process the selected image."));
          return;
        }
        if (blob.size > 1024 * 1024) {
          reject(new Error("The image is still too large after resizing. Choose a smaller image."));
          return;
        }

        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("The selected image couldn't be read."));
        reader.readAsDataURL(blob);
      }, "image/jpeg", 0.82);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("The selected file couldn't be opened as an image."));
    };
    image.src = objectUrl;
  });
}

function getMatchRank(book, query) {
  const fields = [book.title, book.author].map((value) => value.toLocaleLowerCase());

  if (fields.some((value) => value === query)) return 0;
  if (fields.some((value) => value.startsWith(query))) return 1;
  return 2;
}

function openBookDetails(book) {
  dialogTitle.textContent = book.title;
  dialogAuthor.textContent = book.author;
  dialogStatus.textContent = {
    "to-read": "To read",
    reading: "Reading",
    finished: "Finished",
  }[book.status];
  dialogAdded.textContent = new Date(book.createdAt).toLocaleDateString();
  dialogDescription.textContent = book.description?.trim() || "No description added.";
  dialogEditedRow.hidden = typeof book.updatedAt !== "number";
  if (typeof book.updatedAt === "number") {
    dialogEdited.textContent = new Date(book.updatedAt).toLocaleDateString();
  }

  dialogCover.hidden = true;
  dialogCoverPlaceholder.hidden = false;
  dialogCover.onerror = () => {
    dialogCover.hidden = true;
    dialogCoverPlaceholder.hidden = false;
  };
  if (book.cover) {
    dialogCover.src = book.cover;
    dialogCover.alt = `Cover of ${book.title}`;
    dialogCover.onload = () => {
      dialogCover.hidden = false;
      dialogCoverPlaceholder.hidden = true;
    };
  }

  bookDialog.showModal();
}

function createBookCard(book) {
  const card = template.content.firstElementChild.cloneNode(true);
  const title = card.querySelector(".book-title");
  const author = card.querySelector(".book-author");
  const cover = card.querySelector(".book-cover");
  const placeholder = card.querySelector(".cover-placeholder");
  const coverError = card.querySelector(".cover-error");
  const status = card.querySelector(".book-status");
  const statusLabel = card.querySelector(".status-label");
  const display = card.querySelector(".book-display");
  const editor = card.querySelector(".book-editor");
  const editButton = card.querySelector(".edit-button");
  const editTitle = card.querySelector(".edit-title");
  const editAuthor = card.querySelector(".edit-author");
  const editDescription = card.querySelector(".edit-description");
  const editCoverPicker = card.querySelector(".edit-cover-picker");
  setupCoverPicker(editCoverPicker, `cover-source-${book.id}`, book.cover.startsWith("data:image/") ? "device" : "url");
  const editCover = editCoverPicker.querySelector(".cover-url");
  const editCoverFile = editCoverPicker.querySelector(".cover-file");
  const cancelEditButton = card.querySelector(".cancel-edit-button");
  const deleteButton = card.querySelector(".delete-button");

  title.textContent = book.title;
  author.textContent = book.author;
  card.setAttribute("aria-label", `View details for ${book.title} by ${book.author}`);
  status.value = book.status;
  status.setAttribute("aria-label", `Change reading status for ${book.title}`);
  statusLabel.textContent = `Reading status for ${book.title}`;
  editButton.setAttribute("aria-label", `Edit ${book.title}`);
  deleteButton.setAttribute("aria-label", `Delete ${book.title}`);

  if (book.cover) {
    cover.src = book.cover;
    cover.alt = `Cover of ${book.title}`;
    cover.hidden = false;
    placeholder.hidden = true;
    cover.addEventListener("error", () => {
      cover.hidden = true;
      placeholder.hidden = false;
      coverError.hidden = false;
    }, { once: true });
  }

  card.addEventListener("click", (event) => {
    if (event.target.closest("button, select, input, label, form, a")) return;
    openBookDetails(book);
  });

  card.addEventListener("keydown", (event) => {
    if (event.target !== card || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    openBookDetails(book);
  });

  status.addEventListener("change", () => {
    const storedBook = books.find((item) => item.id === book.id);
    if (!storedBook || !VALID_STATUSES.has(status.value)) return;
    const previousStatus = storedBook.status;
    const previousUpdatedAt = storedBook.updatedAt;
    storedBook.status = status.value;
    storedBook.updatedAt = Date.now();
    if (!saveBooks()) {
      storedBook.status = previousStatus;
      storedBook.updatedAt = previousUpdatedAt;
      return;
    }
    renderBooks();
  });

  editButton.addEventListener("click", () => {
    editTitle.value = book.title;
    editAuthor.value = book.author;
    editDescription.value = book.description || "";
    editCover.value = book.cover.startsWith("data:image/") ? "" : book.cover;
    display.hidden = true;
    editor.hidden = false;
    editTitle.focus();
  });

  editor.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!editor.reportValidity()) return;

    const updatedTitle = editTitle.value.trim();
    const updatedAuthor = editAuthor.value.trim();
    const updatedDescription = editDescription.value.trim();
    if (!updatedTitle || !updatedAuthor) return;

    const storedBook = books.find((item) => item.id === book.id);
    if (!storedBook) return;
    let updatedCover = editCover.value.trim();
    if (editCoverPicker.querySelector('input[type="radio"]:checked').value === "device") {
      updatedCover = storedBook.cover;
    }
    if (editCoverPicker.querySelector('input[type="radio"]:checked').value === "device" && editCoverFile.files[0]) {
      try {
        updatedCover = await readCoverFile(editCoverFile.files[0]);
      } catch (error) {
        showStorageError(error.message);
        return;
      }
    }

    const previousBook = { ...storedBook };
    storedBook.title = updatedTitle;
    storedBook.author = updatedAuthor;
    storedBook.description = updatedDescription;
    storedBook.cover = updatedCover;
    storedBook.updatedAt = Date.now();
    if (!saveBooks()) {
      Object.assign(storedBook, previousBook);
      return;
    }
    renderBooks();
  });

  cancelEditButton.addEventListener("click", () => {
    editor.hidden = true;
    display.hidden = false;
    editButton.focus();
  });

  deleteButton.addEventListener("click", () => {
    books = books.filter((item) => item.id !== book.id);
    saveBooks();
    renderBooks();
  });

  return card;
}

function renderBooks() {
  const query = searchInput.value.trim().toLocaleLowerCase();
  const hasActiveFilter = filterInput.value !== "all";
  const matches = books
    .filter((book) =>
      book.title.toLocaleLowerCase().includes(query)
      || book.author.toLocaleLowerCase().includes(query)
    )
    .filter((book) => filterInput.value === "all" || book.status === filterInput.value);

  const newestFirst = (a, b) => b.createdAt - a.createdAt;
  const alphabetical = (field, direction) => (a, b) =>
    a[field].localeCompare(b[field], undefined, { numeric: true, sensitivity: "base" }) * direction
    || newestFirst(a, b);

  let visibleBooks;
  switch (sortInput.value) {
    case "newest":
      visibleBooks = matches.sort(newestFirst);
      break;
    case "title-asc":
      visibleBooks = matches.sort(alphabetical("title", 1));
      break;
    case "title-desc":
      visibleBooks = matches.sort(alphabetical("title", -1));
      break;
    case "author-asc":
      visibleBooks = matches.sort(alphabetical("author", 1));
      break;
    case "author-desc":
      visibleBooks = matches.sort(alphabetical("author", -1));
      break;
    default:
      visibleBooks = matches.sort((a, b) =>
        (query ? getMatchRank(a, query) - getMatchRank(b, query) : 0)
        || newestFirst(a, b)
      );
  }

  const totalPages = Math.ceil(visibleBooks.length / BOOKS_PER_PAGE);
  currentPage = Math.min(currentPage, Math.max(totalPages, 1));
  pageInputs.forEach((input) => {
    input.max = String(Math.max(totalPages, 1));
    input.value = String(currentPage);
  });
  const start = (currentPage - 1) * BOOKS_PER_PAGE;
  const pageBooks = visibleBooks.slice(start, start + BOOKS_PER_PAGE);
  list.replaceChildren(...pageBooks.map(createBookCard));

  paginationControls.forEach((control) => {
    control.hidden = totalPages <= 1;
  });
  previousPageButtons.forEach((button) => {
    button.disabled = currentPage <= 1;
  });
  nextPageButtons.forEach((button) => {
    button.disabled = currentPage >= totalPages;
  });
  const summary = visibleBooks.length
    ? `Showing ${start + 1}–${Math.min(start + BOOKS_PER_PAGE, visibleBooks.length)} of ${visibleBooks.length} books · Page ${currentPage} of ${totalPages}`
    : "";
  pageSummaries.forEach((element) => {
    element.textContent = summary;
  });

  const hasBooks = books.length > 0;
  const hasSearchOrFilter = query.length > 0 || hasActiveFilter;
  emptyState.hidden = hasBooks;

  document.querySelector("#count-to-read").textContent =
    books.filter((book) => book.status === "to-read").length;
  document.querySelector("#count-reading").textContent =
    books.filter((book) => book.status === "reading").length;
  document.querySelector("#count-finished").textContent =
    books.filter((book) => book.status === "finished").length;

  let noResults = document.querySelector("#no-results");
  if (hasBooks && hasSearchOrFilter && visibleBooks.length === 0) {
    if (!noResults) {
      noResults = document.createElement("p");
      noResults.id = "no-results";
      noResults.className = "empty-state";
      noResults.textContent = "No books match your search and filters.";
    }
    list.after(noResults);
  } else {
    noResults?.remove();
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;

  const title = titleInput.value.trim();
  const author = authorInput.value.trim();
  const description = descriptionInput.value.trim();
  const status = statusInput.value;
  const coverSource = coverPicker.querySelector('input[type="radio"]:checked').value;
  let cover = coverSource === "url" ? coverInput.value.trim() : "";

  if (!title || !author || !VALID_STATUSES.has(status)) return;

  if (coverSource === "device" && coverFileInput.files[0]) {
    try {
      cover = await readCoverFile(coverFileInput.files[0]);
    } catch (error) {
      showStorageError(error.message);
      return;
    }
  }

  const newBook = {
    id: window.crypto.randomUUID(),
    title,
    author,
    description,
    status,
    cover,
    createdAt: Date.now(),
  };
  books.push(newBook);

  currentPage = 1;
  if (!saveBooks()) {
    books = books.filter((book) => book.id !== newBook.id);
    return;
  }
  form.reset();
  updateCoverPicker(coverPicker);
  formMessage.textContent = `"${title}" was added to your shelf.`;
  renderBooks();
  titleInput.focus();
});

function resetPageAndRender() {
  currentPage = 1;
  renderBooks();
}

searchInput.addEventListener("input", resetPageAndRender);
sortInput.addEventListener("change", resetPageAndRender);
filterInput.addEventListener("change", resetPageAndRender);
previousPageButtons.forEach((button) => button.addEventListener("click", () => {
  if (currentPage <= 1) return;
  currentPage -= 1;
  renderBooks();
}));
nextPageButtons.forEach((button) => button.addEventListener("click", () => {
  currentPage += 1;
  renderBooks();
}));
pageJumpForms.forEach((form) => form.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = form.querySelector(".page-input");
  if (!input.reportValidity()) return;

  const requestedPage = Number(input.value);
  const query = searchInput.value.trim().toLocaleLowerCase();
  const visibleBookCount = books.filter((book) =>
    (book.title.toLocaleLowerCase().includes(query)
      || book.author.toLocaleLowerCase().includes(query))
    && (filterInput.value === "all" || book.status === filterInput.value)
  ).length;
  const totalPages = Math.ceil(visibleBookCount / BOOKS_PER_PAGE);
  currentPage = Math.min(Math.max(requestedPage, 1), totalPages);
  renderBooks();
}));

dialogClose.addEventListener("click", () => bookDialog.close());
bookDialog.addEventListener("click", (event) => {
  if (event.target === bookDialog) bookDialog.close();
});

viewButtons.forEach((button) => {
  button.addEventListener("click", () => setBookView(button.dataset.view));
});

themeToggle.addEventListener("click", () => setTheme(theme === "dark" ? "light" : "dark"));
setupCoverPicker(coverPicker, "book-cover-source");
setBookView(bookView);
setTheme(theme);
renderBooks();
