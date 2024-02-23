"use client";

import React, { useState } from "react";
import Papa from "papaparse";

export default function Home() {
  const [error, setError] = useState<string>();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelected = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files) return;
    setIsProcessing(true);

    try {
      const transactions = (
        await Promise.all([...files].map(readAndProcessData))
      ).flat();
      const flattenedTransactions = transactions.flat();
      const ynabCsv = Papa.unparse(flattenedTransactions);
      const blob = new Blob([ynabCsv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ynab.csv";
      a.click();
    } catch (e) {
      console.error(e);
      if (typeof e === "string") setError(e);
      if (e instanceof Error) setError(e.message);
    }
    setIsProcessing(false);
  };

  if (isProcessing) return <p>Processing...</p>;
  return (
    <div>
      {error && <p className="text-red-500">{error}</p>}
      <input
        type="file"
        onChange={handleFileSelected}
        accept="text/csv"
        multiple
      />
    </div>
  );
}

const readAndProcessData = (file: File) => {
  const reader = new FileReader();
  return new Promise<
    {
      ["Date"]: string;
      ["Memo"]: string;
      ["Payee"]: string;
      ["Outflow"]: string;
      ["Inflow"]: string;
    }[]
  >((resolve, reject) => {
    reader.onload = (e) => {
      const content = e.target?.result?.toString() || "";
      if (!content.startsWith("Firstname Lastname"))
        reject("Invalid Lydia CSV file");
      const lines = content.split("\n").slice(5);
      const { data } = Papa.parse(lines.join("\n"));
      const transactions = data.slice(1).map((row) => {
        const [date, description, outflow, inflow] = row as string[];
        const { payee, memo } = parseDescription(description);
        return {
          ["Date"]: date,
          ["Memo"]: memo,
          ["Payee"]: payee,
          ["Outflow"]: outflow,
          ["Inflow"]: inflow,
        };
      });
      resolve(transactions);
    };

    reader.onerror = () => {
      reject("Error reading file");
    };

    reader.readAsText(file);
  });
};

const parseDescription = (description?: string) => {
  if (!description)
    return {
      payee: "",
      memo: "",
    };
  if (description.includes("Payment to")) {
    return {
      payee: description.split("Payment to")[1].trim(),
      memo: "",
    };
  }
  if (description.includes("Card transaction:")) {
    return {
      payee: description.split("Card transaction:")[1].trim(),
      memo: "",
    };
  }
  if (description.includes("received from")) {
    return {
      payee: description.split("received from")[1].trim(),
      memo: "",
    };
  }
  if (description.includes("Direct debit:")) {
    return {
      payee: description.split("Direct debit:")[1].trim(),
      memo: "",
    };
  }
  return {
    payee: "",
    memo: description,
  };
};
