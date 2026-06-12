import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// Supabase Configuration
// Leave these empty to use local IndexedDB. Fill them to connect to your cloud PostgreSQL database.
const SUPABASE_URL = "";
const SUPABASE_ANON_KEY = "";

const useSupabase = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
let supabase = null;

if (useSupabase) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Local IndexedDB configuration
const DB_NAME = "GuestDatabase";
const DB_VERSION = 1;
const STORE_NAME = "guests";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => reject(event.target.error);
    request.onsuccess = (event) => resolve(event.target.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    };
  });
}

export async function addGuests(guests) {
  if (useSupabase) {
    const records = guests.map((guest) => ({
      name: guest.name,
      dob: guest.dob,
      birthdate_correct_up_to: guest.birthdateCorrectUpTo,
      gender: guest.gender,
      nationality_code: guest.nationalityCode,
      passport_number: guest.passportNumber,
      arrival_date: guest.arrivalDate,
      expected_leaving_date: guest.expectedLeavingDate,
      checkout_date: guest.checkoutDate,
      room_number: guest.roomNumber,
    }));

    const { data, error } = await supabase
      .from("guests")
      .insert(records);

    if (error) {
      throw error;
    }
    return data;
  }

  // Fallback to IndexedDB
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    guests.forEach((guest) => {
      store.add({
        name: guest.name,
        dob: guest.dob,
        birthdateCorrectUpTo: guest.birthdateCorrectUpTo,
        gender: guest.gender,
        nationalityCode: guest.nationalityCode,
        passportNumber: guest.passportNumber,
        arrivalDate: guest.arrivalDate,
        expectedLeavingDate: guest.expectedLeavingDate,
        checkoutDate: guest.checkoutDate,
        roomNumber: guest.roomNumber,
        loggedAt: new Date().toISOString(),
      });
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = (event) => reject(event.target.error);
  });
}

export async function getAllGuests() {
  if (useSupabase) {
    const { data, error } = await supabase
      .from("guests")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      throw error;
    }

    return (data || []).map((g) => ({
      id: g.id,
      name: g.name,
      dob: g.dob,
      birthdateCorrectUpTo: g.birthdate_correct_up_to,
      gender: g.gender,
      nationalityCode: g.nationality_code,
      passportNumber: g.passport_number,
      arrivalDate: g.arrival_date,
      expectedLeavingDate: g.expected_leaving_date,
      checkoutDate: g.checkout_date,
      roomNumber: g.room_number,
      loggedAt: g.logged_at,
    }));
  }

  // Fallback to IndexedDB
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

export async function deleteGuest(id) {
  if (useSupabase) {
    const { error } = await supabase
      .from("guests")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }
    return;
  }

  // Fallback to IndexedDB
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    transaction.oncomplete = () => resolve();
    transaction.onerror = (event) => reject(event.target.error);
  });
}

export async function clearAllGuests() {
  if (useSupabase) {
    const { error } = await supabase
      .from("guests")
      .delete()
      .neq("id", 0); // Deletes all rows in Supabase since id is auto-incrementing non-zero

    if (error) {
      throw error;
    }
    return;
  }

  // Fallback to IndexedDB
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    transaction.oncomplete = () => resolve();
    transaction.onerror = (event) => reject(event.target.error);
  });
}
