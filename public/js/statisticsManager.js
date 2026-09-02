// load aggregation data and draw the charts
// Wait for the DOM to fully load before running the script
document.addEventListener("DOMContentLoaded", async () => {
    const draw = (selector, data, emptyId) => {

        // Select the container and clear any existing SVG elements to prevent duplicates   
        const container = d3.select(selector);
        container.selectAll("*").remove();

        // Show or hide the "No Data" placeholder message
        document.getElementById(emptyId).hidden = data.length > 0;
        if (!data.length) return;

        // Set up SVG dimensions and margins for rendering
        const width = Math.max(520, container.node().clientWidth || 700);
        const height = 360;
        const margin = { top: 20, right: 20, bottom: 90, left: 55 };

        // Create the main SVG canvas
        const svg = container.append("svg").attr("viewBox", `0 0 ${width} ${height}`);

        // Define X (categories/cities) and Y (values/counts) scales
        const x = d3.scaleBand()
            .domain(data.map(d => d.city))
            .range([margin.left, width - margin.right])
            .padding(.25);

        const y = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.count) || 1])
            .nice()
            .range([height - margin.bottom, margin.top]);

        // Draw the X-axis and angle the labels for better readability
        svg.append("g")
            .attr("transform", `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("transform", "rotate(-35)")
            .style("text-anchor", "end");

        // Draw the Y-axis with formatted integer ticks
        svg.append("g")
            .attr("transform", `translate(${margin.left},0)`)
            .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format("d")));

        // Add a small legend to the top right of the chart
        const legend = svg.append("g")
            .attr("class", "chart-legend")
            .attr("transform", `translate(${Math.max(margin.left, width - 120)},${margin.top})`);

        legend.append("rect").attr("width", 12).attr("height", 12).attr("class", "chart-bar");
        legend.append("text").attr("x", 18).attr("y", 10).text("Count");

        // Initialize a hidden tooltip div for hover interactions
        const tooltip = d3.select("body")
            .append("div")
            .attr("class", "chart-tooltip")
            .style("display", "none");

        // Draw the data bars and bind mouse events for the tooltip
        svg.selectAll("rect.chart-data-bar")
            .data(data)
            .enter()
            .append("rect")
            .attr("x", d => x(d.city))
            .attr("y", d => y(d.count))
            .attr("width", x.bandwidth())
            .attr("height", d => y(0) - y(d.count))
            .attr("class", "chart-bar chart-data-bar")
            .on("mousemove", (event, d) => tooltip
                .style("display", "block")
                .style("left", `${event.pageX + 12}px`)
                .style("top", `${event.pageY - 20}px`)
                .text(`${d.city}: ${d.count}`))
            .on("mouseleave", () => tooltip.style("display", "none"));
    };

    const groupId = new URLSearchParams(window.location.search).get("groupId");

    if (groupId) {
        // Group Statistics Mode: Hide friends statistics card
        const friendsCard = document.getElementById("friends-statistics-card");
        if (friendsCard) friendsCard.hidden = true;

        const card = document.getElementById("group-statistics-card");
        const errorBox = document.getElementById("group-statistics-error");

        try {
            // Fetch member distribution data for the specific group
            const response = await fetch(
                `/statistics/groups/${encodeURIComponent(groupId)}/members-by-city`,
                { headers: { Accept: "application/json" } }
            );
            const result = await response.json();

            if (!response.ok) {
                // Display error if the user lacks permissions (e.g., not an admin)
                errorBox.textContent = result.error || "You are not allowed to view these group statistics.";
                errorBox.hidden = false;
                return;
            }

            // Update UI title and trigger the chart drawing function
            card.hidden = false;
            document.getElementById("group-statistics-title").textContent =
                `${result.groupName} - Member Location Distribution`;

            draw("#group-chart", result.data || [], "group-empty");
        } catch (error) {
            console.error("Group statistics load failed:", error);
            errorBox.textContent = "Could not load group statistics.";
            errorBox.hidden = false;
        }
    } else {
        // Friends Statistics Mode: Load friends statistics card
        try {
            const response = await fetch("/statistics/friends-by-city", {
                headers: { Accept: "application/json" }
            });
            const result = await response.json();

            if (!response.ok) throw new Error(result.error || "Could not load friend statistics");

            // Trigger the chart drawing function
            draw("#friends-chart", result.data || [], "friends-empty");
        } catch (error) {
            console.error("Friend statistics load failed:", error);
            document.getElementById("friends-empty").hidden = false;
        }
    }
});