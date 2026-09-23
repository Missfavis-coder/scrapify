import { Page } from "playwright";
import { logger } from "../utils/logger.js";
import { WorkflowGraph, WorkflowStep } from "../schemas/workflow.schema.js";

interface DiscoveredElement {
  type: "search" | "category" | "card_container";
  selector: string;
  confidence: number;
  meta?: Record<string, unknown>;
}

/**
 * Discovers interactive elements and list structures on the page based on task description.
 */
export async function discoverPageElements(
  page: Page,
  taskDescription: string
): Promise<{ steps: WorkflowStep[]; parameters: string[] }> {
  const lowerTask = taskDescription.toLowerCase();
  const steps: WorkflowStep[] = [];
  const parameters: string[] = [];

  // Step 1: Navigate to the target page
  steps.push({
    action: "navigate",
    url: page.url(),
    description: `Navigate to ${new URL(page.url()).hostname}`,
  });

  // Step 2: Analyze the DOM for relevant components
  const pageAnalysis = await page.evaluate(() => {
    // 1. Look for search inputs
    const searchInputs = Array.from(
      document.querySelectorAll<HTMLInputElement>(
        'input[type="search"], input[name*="search" i], input[placeholder*="search" i], input[aria-label*="search" i], input[type="text"]'
      )
    ).map((input) => {
      let sel = "";
      if (input.id) sel = `#${input.id}`;
      else if (input.name) sel = `input[name="${input.name}"]`;
      else if (input.placeholder) sel = `input[placeholder="${input.placeholder}"]`;
      else if (input.type === "search") sel = 'input[type="search"]';
      else sel = "input[type='text']";

      return {
        selector: sel,
        placeholder: input.placeholder,
        name: input.name,
      };
    });

    // 2. Look for category / filter links in sidebars or navs
    const navLinks = Array.from(
      document.querySelectorAll("nav a, aside a, .sidebar a, .categories a, .side_categories a")
    )
      .slice(0, 30)
      .map((a) => ({
        text: a.textContent?.trim() || "",
        href: (a as HTMLAnchorElement).href,
      }))
      .filter((a) => a.text.length > 0);

    // 3. Look for repeated card/product containers
    const candidateSelectors = [
      "article.product_pod",
      ".product-card",
      ".product_pod",
      ".product-item",
      "[data-testid*='product']",
      ".thumbnail",
      "article",
      "li.col-xs-6",
      ".card",
      ".item",
    ];

    let bestContainerSelector = "";
    let maxCount = 0;

    for (const sel of candidateSelectors) {
      const count = document.querySelectorAll(sel).length;
      if (count >= 2 && count > maxCount) {
        maxCount = count;
        bestContainerSelector = sel;
      }
    }

    return {
      searchInputs,
      navLinks,
      bestContainerSelector: bestContainerSelector || "article",
      itemCount: maxCount,
    };
  });

  logger.info("DOM discovery analysis complete", {
    foundSearch: pageAnalysis.searchInputs.length,
    foundNavLinks: pageAnalysis.navLinks.length,
    bestContainer: pageAnalysis.bestContainerSelector,
    itemCount: pageAnalysis.itemCount,
  });

  // Check if task wants to filter or search
  const isSearchTask =
    lowerTask.includes("search") || lowerTask.includes("query") || lowerTask.includes("find");
  const isCategoryTask =
    lowerTask.includes("category") ||
    lowerTask.includes("genre") ||
    lowerTask.includes("section") ||
    pageAnalysis.navLinks.some((l) => lowerTask.includes(l.text.toLowerCase()));

  if (isSearchTask && pageAnalysis.searchInputs.length > 0) {
    const input = pageAnalysis.searchInputs[0];
    steps.push({
      action: "search",
      selector: input.selector,
      value: "{{query}}",
      description: `Search using input '${input.placeholder || input.name || "search"}'`,
    });
    parameters.push("query");
  } else if (isCategoryTask && pageAnalysis.navLinks.length > 0) {
    // Check if a specific category was mentioned in task
    const matchedCategory = pageAnalysis.navLinks.find((l) =>
      lowerTask.includes(l.text.toLowerCase())
    );

    if (matchedCategory) {
      steps.push({
        action: "click",
        selector: `a:has-text("${matchedCategory.text}")`,
        description: `Filter by category '${matchedCategory.text}'`,
      });
    }
  }

  // Determine fields to extract based on task description
  const extractFields: string[] = ["title", "price", "link"];
  if (lowerTask.includes("availab") || lowerTask.includes("stock")) {
    extractFields.push("availability");
  }
  if (lowerTask.includes("rating") || lowerTask.includes("star")) {
    extractFields.push("rating");
  }

  // Add the extract step
  steps.push({
    action: "extract",
    selector: pageAnalysis.bestContainerSelector,
    fields: extractFields,
    description: `Extract structured items (${extractFields.join(", ")})`,
  });

  return { steps, parameters };
}
