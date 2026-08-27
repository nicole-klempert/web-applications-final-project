document.addEventListener(
    "DOMContentLoaded",
    () => {
        // ==================================================
        // AUTHENTICATION
        // ==================================================
        const currentUser =
            (
                localStorage.getItem(
                    "loggedInUser"
                ) || ""
            ).trim();
        if (!currentUser) {
            window.location.replace(
                "login.html"
            );
            return;
        }
        // ==================================================
        // DOM
        // ==================================================
        const postsChart =
            document.getElementById(
                "posts-chart"
            );
        const postsLoading =
            document.getElementById(
                "posts-chart-loading"
            );
        const postsEmpty =
            document.getElementById(
                "posts-chart-empty"
            );
        const membersChart =
            document.getElementById(
                "members-chart"
            );
        const membersLoading =
            document.getElementById(
                "members-chart-loading"
            );
        const membersEmpty =
            document.getElementById(
                "members-chart-empty"
            );
        const tooltip =
            d3.select(
                "#chart-tooltip"
            );
        // helper
        // clear chart
       
        const clearChart =
            container => {
                d3.select(
                    container
                )
                    .selectAll("*")
                    .remove();
            };
        // tool tip
        const showTooltip =
            (
                event,
                html
            ) => {
                tooltip
                    .html(
                        html
                    )
                    .style(
                        "display",
                        "block"
                    )
                    .style(
                        "left",
                        `${event.pageX + 12}px`
                    )
                    .style(
                        "top",
                        `${event.pageY - 25}px`
                    );
            };
        const moveTooltip =
            event => {
                tooltip
                    .style(
                        "left",
                        `${event.pageX + 12}px`
                    )
                    .style(
                        "top",
                        `${event.pageY - 25}px`
                    );
            };
        const hideTooltip =
            () => {
                tooltip.style(
                    "display",
                    "none"
                );
            };

        // GRAPH 1
        // posts per group
        
        const drawPostsPerGroupChart =
            data => {
                clearChart(
                    postsChart
                );
                const containerWidth =
                    postsChart.clientWidth ||
                    800;
                const margin = {
                    top: 30,
                    right: 30,
                    bottom: 100,
                    left: 65
                };
                const width =
                    containerWidth;
                const height =
                    430;
                const innerWidth =
                    width -
                    margin.left -
                    margin.right;
                const innerHeight =
                    height -
                    margin.top -
                    margin.bottom;
                // create svg
                const svg =
                    d3.select(
                        postsChart
                    )
                        .append(
                            "svg"
                        )
                        .attr(
                            "width",
                            width
                        )
                        .attr(
                            "height",
                            height
                        )
                        .attr(
                            "viewBox",
                            `0 0 ${width} ${height}`
                        );
                const chart =
                    svg.append(
                        "g"
                    )
                        .attr(
                            "transform",
                            `translate(${margin.left},${margin.top})`
                        );
                // X scale
                const x =
                    d3.scaleBand()
                        .domain(
                            data.map(
                                item =>
                                    item.groupName
                            )
                        )
                        .range([
                            0,
                            innerWidth
                        ])
                        .padding(
                            0.25
                        );
                // Y scale
                const maxPosts =
                    d3.max(
                        data,
                        item =>
                            item.postCount
                    ) || 0;
                const y =
                    d3.scaleLinear()
                        .domain([
                            0,
                            maxPosts
                        ])
                        .nice()
                        .range([
                            innerHeight,
                            0
                        ]);
                // X axis
                chart
                    .append(
                        "g"
                    )
                    .attr(
                        "class",
                        "axis"
                    )
                    .attr(
                        "transform",
                        `translate(0,${innerHeight})`
                    )
                    .call(
                        d3.axisBottom(
                            x
                        )
                    )
                    .selectAll(
                        "text"
                    )
                    .attr(
                        "transform",
                        "rotate(-35)"
                    )
                    .style(
                        "text-anchor",
                        "end"
                    );
                // Y axis
                chart
                    .append(
                        "g"
                    )
                    .attr(
                        "class",
                        "axis"
                    )
                    .call(
                        d3.axisLeft(
                            y
                        )
                            .ticks(
                                Math.min(
                                    maxPosts + 1,
                                    8
                                )
                            )
                            .tickFormat(
                                d3.format(
                                    "d"
                                )
                            )
                    );
                // Y axis title
                chart
                    .append(
                        "text"
                    )
                    .attr(
                        "class",
                        "axis-title"
                    )
                    .attr(
                        "transform",
                        "rotate(-90)"
                    )
                    .attr(
                        "x",
                        -innerHeight / 2
                    )
                    .attr(
                        "y",
                        -48
                    )
                    .attr(
                        "text-anchor",
                        "middle"
                    )
                    .text(
                        "Number of Posts"
                    );
                // bars
                chart
                    .selectAll(
                        ".posts-bar"
                    )
                    .data(
                        data
                    )
                    .enter()
                    .append(
                        "rect"
                    )
                    .attr(
                        "class",
                        "chart-bar posts-bar"
                    )
                    .attr(
                        "x",
                        item =>
                            x(
                                item.groupName
                            )
                    )
                    .attr(
                        "y",
                        item =>
                            y(
                                item.postCount
                            )
                    )
                    .attr(
                        "width",
                        x.bandwidth()
                    )
                    .attr(
                        "height",
                        item =>
                            innerHeight -
                            y(
                                item.postCount
                            )
                    )
                    .attr(
                        "rx",
                        5
                    )
                    .on(
                        "mouseenter",
                        (
                            event,
                            item
                        ) => {
                            showTooltip(
                                event,
                                `
                                    <strong>
                                        ${item.groupName}
                                    </strong>
                                    <br>
                                    Posts:
                                    ${item.postCount}
                                    ${item.category
                                    ? `<br>Category: ${item.category}`
                                    : ""
                                }
                                    ${item.city
                                    ? `<br>City: ${item.city}`
                                    : ""
                                }
                                `
                            );
                        }
                    )
                    .on(
                        "mousemove",
                        moveTooltip
                    )
                    .on(
                        "mouseleave",
                        hideTooltip
                    );
                // values above bars
                chart
                    .selectAll(
                        ".posts-value"
                    )
                    .data(
                        data
                    )
                    .enter()
                    .append(
                        "text"
                    )
                    .attr(
                        "class",
                        "bar-value"
                    )
                    .attr(
                        "x",
                        item =>
                            x(
                                item.groupName
                            ) +
                            x.bandwidth() / 2
                    )
                    .attr(
                        "y",
                        item =>
                            y(
                                item.postCount
                            ) - 8
                    )
                    .attr(
                        "text-anchor",
                        "middle"
                    )
                    .text(
                        item =>
                            item.postCount
                    );
            };
       
        // GRAPH 2
        // members per city
       
        const drawMembersPerCityChart =
            data => {
                clearChart(
                    membersChart
                );
                const containerWidth =
                    membersChart.clientWidth ||
                    800;
                const margin = {
                    top: 30,
                    right: 30,
                    bottom: 90,
                    left: 65
                };
                const width =
                    containerWidth;
                const height =
                    430;
                const innerWidth =
                    width -
                    margin.left -
                    margin.right;
                const innerHeight =
                    height -
                    margin.top -
                    margin.bottom;
                const svg =
                    d3.select(
                        membersChart
                    )
                        .append(
                            "svg"
                        )
                        .attr(
                            "width",
                            width
                        )
                        .attr(
                            "height",
                            height
                        )
                        .attr(
                            "viewBox",
                            `0 0 ${width} ${height}`
                        );
                const chart =
                    svg.append(
                        "g"
                    )
                        .attr(
                            "transform",
                            `translate(${margin.left},${margin.top})`
                        );
                const x =
                    d3.scaleBand()
                        .domain(
                            data.map(
                                item =>
                                    item.city
                            )
                        )
                        .range([
                            0,
                            innerWidth
                        ])
                        .padding(
                            0.25
                        );
                const maxMembers =
                    d3.max(
                        data,
                        item =>
                            item.memberCount
                    ) || 0;
                const y =
                    d3.scaleLinear()
                        .domain([
                            0,
                            maxMembers
                        ])
                        .nice()
                        .range([
                            innerHeight,
                            0
                        ]);
                // X axis
                chart
                    .append(
                        "g"
                    )
                    .attr(
                        "class",
                        "axis"
                    )
                    .attr(
                        "transform",
                        `translate(0,${innerHeight})`
                    )
                    .call(
                        d3.axisBottom(
                            x
                        )
                    )
                    .selectAll(
                        "text"
                    )
                    .attr(
                        "transform",
                        "rotate(-30)"
                    )
                    .style(
                        "text-anchor",
                        "end"
                    );
                // Y axis
                chart
                    .append(
                        "g"
                    )
                    .attr(
                        "class",
                        "axis"
                    )
                    .call(
                        d3.axisLeft(
                            y
                        )
                            .ticks(
                                Math.min(
                                    maxMembers + 1,
                                    8
                                )
                            )
                            .tickFormat(
                                d3.format(
                                    "d"
                                )
                            )
                    );
                // Y axis title
                chart
                    .append(
                        "text"
                    )
                    .attr(
                        "class",
                        "axis-title"
                    )
                    .attr(
                        "transform",
                        "rotate(-90)"
                    )
                    .attr(
                        "x",
                        -innerHeight / 2
                    )
                    .attr(
                        "y",
                        -48
                    )
                    .attr(
                        "text-anchor",
                        "middle"
                    )
                    .text(
                        "Number of Members"
                    );
                // bars
                chart
                    .selectAll(
                        ".members-bar"
                    )
                    .data(
                        data
                    )
                    .enter()
                    .append(
                        "rect"
                    )
                    .attr(
                        "class",
                        "chart-bar members-bar"
                    )
                    .attr(
                        "x",
                        item =>
                            x(
                                item.city
                            )
                    )
                    .attr(
                        "y",
                        item =>
                            y(
                                item.memberCount
                            )
                    )
                    .attr(
                        "width",
                        x.bandwidth()
                    )
                    .attr(
                        "height",
                        item =>
                            innerHeight -
                            y(
                                item.memberCount
                            )
                    )
                    .attr(
                        "rx",
                        5
                    )
                    .on(
                        "mouseenter",
                        (
                            event,
                            item
                        ) => {
                            showTooltip(
                                event,
                                `
                                    <strong>
                                        ${item.city}
                                    </strong>
                                    <br>
                                    Members:
                                    ${item.memberCount}
                                    <br>
                                    Groups:
                                    ${item.groupCount}
                                `
                            );
                        }
                    )
                    .on(
                        "mousemove",
                        moveTooltip
                    )
                    .on(
                        "mouseleave",
                        hideTooltip
                    );
                // values above bars
                chart
                    .selectAll(
                        ".members-value"
                    )
                    .data(
                        data
                    )
                    .enter()
                    .append(
                        "text"
                    )
                    .attr(
                        "class",
                        "bar-value"
                    )
                    .attr(
                        "x",
                        item =>
                            x(
                                item.city
                            ) +
                            x.bandwidth() / 2
                    )
                    .attr(
                        "y",
                        item =>
                            y(
                                item.memberCount
                            ) - 8
                    )
                    .attr(
                        "text-anchor",
                        "middle"
                    )
                    .text(
                        item =>
                            item.memberCount
                    );
            };
       
        // load posts per group
        
        const loadPostsPerGroup =
            async () => {
                postsLoading.style.display =
                    "block";
                postsEmpty.style.display =
                    "none";
                try {
                    const response =
                        await fetch(
                            "/groups/statistics/posts-per-group",
                            {
                                headers: {
                                    "Accept":
                                        "application/json"
                                }
                            }
                        );
                    const result =
                        await response.json();
                    postsLoading.style.display =
                        "none";
                    if (
                        !response.ok ||
                        !result.success
                    ) {
                        throw new Error(
                            result.error ||
                            "Failed to load post statistics."
                        );
                    }
                    if (
                        !Array.isArray(
                            result.data
                        ) ||
                        result.data.length === 0
                    ) {
                        postsEmpty.style.display =
                            "block";
                        return;
                    }
                    drawPostsPerGroupChart(
                        result.data
                    );
                } catch (error) {
                    console.error(
                        "Posts statistics error:",
                        error
                    );
                    postsLoading.style.display =
                        "none";
                    postsEmpty.style.display =
                        "block";
                    postsEmpty.innerText =
                        "Failed to load post statistics.";
                }
            };
        
        // load members per city
        
        const loadMembersPerCity =
            async () => {
                membersLoading.style.display =
                    "block";
                membersEmpty.style.display =
                    "none";
                try {
                    const response =
                        await fetch(
                            "/groups/statistics/members-per-city",
                            {
                                headers: {
                                    "Accept":
                                        "application/json"
                                }
                            }
                        );
                    const result =
                        await response.json();
                    membersLoading.style.display =
                        "none";
                    if (
                        !response.ok ||
                        !result.success
                    ) {
                        throw new Error(
                            result.error ||
                            "Failed to load member statistics."
                        );
                    }
                    if (
                        !Array.isArray(
                            result.data
                        ) ||
                        result.data.length === 0
                    ) {
                        membersEmpty.style.display =
                            "block";
                        return;
                    }
                    drawMembersPerCityChart(
                        result.data
                    );
                } catch (error) {
                    console.error(
                        "Members statistics error:",
                        error
                    );
                    membersLoading.style.display =
                        "none";
                    membersEmpty.style.display =
                        "block";
                    membersEmpty.innerText =
                        "Failed to load member statistics.";
                }
            };
    
        // responsive redraw
        let postsData =
            null;
        let membersData =
            null;
        /*
         * Load both datasets once.
         * The normal load functions above remain responsible
         * for initial rendering.
         */
        const loadStatistics =
            async () => {
                await Promise.all([
                    loadPostsPerGroup(),
                    loadMembersPerCity()
                ]);
            };
        // Start page
        loadStatistics();
    }
);