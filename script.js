(function () {
  "use strict";

  const STORAGE_KEY = "expense-tracker.expenses.v1";
  const ALLOWED_CATEGORIES = ["Еда", "Транспорт", "Дом", "Другое"];

  const form = document.querySelector("#expense-form");
  const amountInput = document.querySelector("#amount");
  const categoryInput = document.querySelector("#category");
  const dateInput = document.querySelector("#date");
  const commentInput = document.querySelector("#comment");
  const amountError = document.querySelector("#amount-error");
  const dateError = document.querySelector("#date-error");
  const formMessage = document.querySelector("#form-message");
  const monthLabel = document.querySelector("#month-label");
  const monthTotal = document.querySelector("#month-total");
  const expenseList = document.querySelector("#expense-list");
  const emptyState = document.querySelector("#empty-state");
  const expenseCount = document.querySelector("#expense-count");

  let expenses = loadExpenses();

  dateInput.value = getLocalDateValue(new Date());
  render();

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    clearErrors();

    const amount = parseAmount(amountInput.value);
    const date = dateInput.value;
    let isValid = true;

    if (amount === null) {
      showFieldError(amountInput, amountError, "Введите целую сумму больше нуля");
      isValid = false;
    }

    if (!isValidDateValue(date)) {
      showFieldError(dateInput, dateError, "Выберите дату");
      isValid = false;
    }

    if (!isValid) {
      return;
    }

    const expense = {
      id: createId(),
      amount: amount,
      category: ALLOWED_CATEGORIES.includes(categoryInput.value) ? categoryInput.value : "Другое",
      date: date,
      comment: commentInput.value.trim(),
      createdAt: Date.now()
    };

    const nextExpenses = [expense].concat(expenses);
    if (!saveExpenses(nextExpenses)) {
      formMessage.textContent = "Не удалось сохранить. Проверьте настройки браузера.";
      return;
    }

    expenses = nextExpenses;
    amountInput.value = "";
    commentInput.value = "";
    dateInput.value = getLocalDateValue(new Date());
    render();
    amountInput.focus();
  });

  amountInput.addEventListener("input", function () {
    clearFieldError(amountInput, amountError);
  });

  dateInput.addEventListener("input", function () {
    clearFieldError(dateInput, dateError);
  });

  function render() {
    renderSummary();
    renderList();
  }

  function renderSummary() {
    const now = new Date();
    const currentMonth = getLocalDateValue(now).slice(0, 7);
    const total = expenses.reduce(function (sum, expense) {
      return expense.date.slice(0, 7) === currentMonth ? sum + expense.amount : sum;
    }, 0);

    const monthName = new Intl.DateTimeFormat("ru-RU", {
      month: "long",
      year: "numeric"
    }).format(now);

    monthLabel.textContent = "Итог за " + monthName;
    monthTotal.textContent = formatMoney(total);
  }

  function renderList() {
    expenseList.replaceChildren();
    emptyState.hidden = expenses.length > 0;
    expenseCount.textContent = formatCount(expenses.length);

    expenses.forEach(function (expense) {
      const item = document.createElement("li");
      item.className = "expense-item";

      const category = document.createElement("p");
      category.className = "expense-item__category";
      category.textContent = expense.category;

      const amount = document.createElement("p");
      amount.className = "expense-item__amount";
      amount.textContent = formatMoney(expense.amount);

      const details = document.createElement("p");
      details.className = "expense-item__details";
      details.textContent = formatDate(expense.date) + (expense.comment ? " · " + expense.comment : "");

      item.append(category, amount, details);
      expenseList.append(item);
    });
  }

  function parseAmount(value) {
    const normalized = value.replace(/[\s\u00a0]+/g, "");
    if (!/^\d+$/.test(normalized)) {
      return null;
    }

    const amount = Number(normalized);
    return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
  }

  function formatMoney(value) {
    const safeValue = Number.isSafeInteger(value) && value >= 0 ? value : 0;
    return String(safeValue).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " ₸";
  }

  function formatDate(value) {
    const parts = value.split("-");
    return parts[2] + "." + parts[1] + "." + parts[0];
  }

  function formatCount(count) {
    const lastTwo = count % 100;
    const last = count % 10;
    let word = "записей";

    if (lastTwo < 11 || lastTwo > 14) {
      if (last === 1) word = "запись";
      if (last >= 2 && last <= 4) word = "записи";
    }

    return count + " " + word;
  }

  function isValidDateValue(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return false;
    }

    const parts = value.split("-").map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    return date.getFullYear() === parts[0] && date.getMonth() === parts[1] - 1 && date.getDate() === parts[2];
  }

  function getLocalDateValue(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
  }

  function loadExpenses() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (!Array.isArray(stored)) {
        return [];
      }

      return stored.filter(isStoredExpenseValid).map(function (expense) {
        return {
          id: String(expense.id),
          amount: expense.amount,
          category: expense.category,
          date: expense.date,
          comment: typeof expense.comment === "string" ? expense.comment : "",
          createdAt: Number.isFinite(expense.createdAt) ? expense.createdAt : 0
        };
      });
    } catch (error) {
      return [];
    }
  }

  function isStoredExpenseValid(expense) {
    return expense &&
      Number.isSafeInteger(expense.amount) &&
      expense.amount > 0 &&
      ALLOWED_CATEGORIES.includes(expense.category) &&
      isValidDateValue(expense.date);
  }

  function saveExpenses(value) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return Date.now() + "-" + Math.random().toString(16).slice(2);
  }

  function showFieldError(input, errorElement, message) {
    input.setAttribute("aria-invalid", "true");
    errorElement.textContent = message;
  }

  function clearFieldError(input, errorElement) {
    input.removeAttribute("aria-invalid");
    errorElement.textContent = "";
  }

  function clearErrors() {
    clearFieldError(amountInput, amountError);
    clearFieldError(dateInput, dateError);
    formMessage.textContent = "";
  }
})();
