

// Conversion de types
const parseNA = string => (string === 'NA' ? undefined : string);
const parseDate = string => d3.utcParse('%Y-%m-%d')(string);

// Conversion des types de données lors du chargement
function type(d) {
    const date = parseDate(d.release_date);
    return {

        // Convertit les valeurs numériques en nombres et les 'NA' en undefined
        // Utilise la bibliothèque Validator.js pour vérifier si les valeurs sont numériques ou JSON
        // Convertit les chaînes de caractères en dates
        budget: validator.isNumeric(d.budget) ? +d.budget : undefined,
        genre: parseNA(d.genre),
        genres: validator.isJSON(d.genres) ? JSON.parse(d.genres).map(d => d.name) : undefined,
        homepage: parseNA(d.homepage),
        id: validator.isNumeric(d.id) ? +d.id : undefined,
        imdb_id: parseNA(d.imdb_id),
        original_language: parseNA(d.original_language),
        overview: parseNA(d.overview),
        popularite: validator.isNumeric(d.popularity) ? +d.popularity : undefined,
        poster_path: parseNA(d.poster_path),
        production_countries: validator.isJSON(d.production_countries) ? JSON.parse(d.production_countries) : undefined,
        release_date: date,
        release_year: date ? date.getFullYear() : undefined,
        revenue: validator.isNumeric(d.revenue) ? +d.revenue : undefined,
        runtime: validator.isNumeric(d.runtime) ? +d.runtime : undefined,
        status: d.status,
        tagline: parseNA(d.tagline),
        title: parseNA(d.title),
        video: d.video,
        vote_average: validator.isNumeric(d.vote_average) ? +d.vote_average : undefined,
        vote_count: validator.isNumeric(d.vote_count) ? +d.vote_count : undefined
    }
}
// Préparation des données
function filterData(data) {
    // Filtre les données selon certaines conditions
    return data.filter(d => {
        return (
            d.release_year > 1999 &&
            d.release_year < 2010 &&
            d.revenue > 0 &&
            d.budget > 0 &&
            d.genre &&
            d.title
        );
    });
}

// Préparation des données pour le graphique à points
function prepareScatterData(data) {
    // Trie et filtre les données pour le graphique à points
    return data.sort((a, b) => b.budget - a.budget).filter((d, i) => i < 100);
}

// Préparation des données pour le graphique en ligne
function prepareLineChartData(data) {
    // Groupe les données par année et extrait les revenus et les budgets
    const groupBy = d => d.release_year;
    const reduceRevenue = values => d3.sum(values, leaf => leaf.revenue);
    const revenueMap = d3.rollup(data, reduceRevenue, groupBy);
    const reduceBudget = values => d3.sum(values, leaf => leaf.budget);
    const budgetMap = d3.rollup(data, reduceBudget, groupBy);

    // Convertit les données groupées en tableaux
    const revenue = Array.from(revenueMap).sort((a, b) => a[0] - b[0]);
    const budget = Array.from(budgetMap).sort((a, b) => a[0] - b[0]);


    // Obtient un tableau des années pour l'échelle et l'axe des x
    const parseYear = d3.timeParse('%Y');
    const dates = revenue.map(d => parseYear(d[0]));

    // Obtient la valeur y maximale pour l'échelle et l'axe des y
    const yValues = [
        ...Array.from(revenueMap.values()),
        ...Array.from(budgetMap.values()),
    ];
    const yMax = d3.max(yValues);

    // Produit l'objet de données final
    const lineData = {
        series: [
            {
                name: 'Revenue',
                color: 'dodgerblue',
                values: revenue.map(d => ({ date: parseYear(d[0]), value: d[1] })),
            },
            {
                name: 'Budget',
                color: 'darkorange',
                values: budget.map(d => ({ date: parseYear(d[0]), value: d[1] })),
            },
        ],
        dates: dates,
        yMax: yMax,
    };

    return lineData;
}


// Utilitaires de dessin
function formatTicks(d) {
    // Formate les marques de graduation (ticks) sur les axes
    return d3
        .format('.2~s')(d)
        .replace('M', ' mil')
        .replace('G', ' bil')
        .replace('T', ' tril');
}


// Dessin nuage de points
function drawScatterChart(scatterData) {




    // Dimensions : convention des marges pour le nuage de points
    const scatterMargin = { top: 80, right: 40, bottom: 40, left: 60 };
    const scatterWidth = 500 - scatterMargin.left - scatterMargin.right;
    const scatterHeight = 500 - scatterMargin.top - scatterMargin.bottom;

    // Scales , Échelles
    const xExtent = d3
        .extent(scatterData, d => d.budget)
        .map((d, i) => (i === 0 ? d * 0.95 : d * 1.05));


    const scatterXScale = d3
        .scaleLinear()
        .domain(xExtent)
        .range([0, scatterWidth]);


    const yExtent = d3
        .extent(scatterData, d => d.revenue)
        .map((d, i) => (i === 0 ? d * 0.1 : d * 1.1));

    const scatterYScale = d3
        .scaleLinear()
        .domain(yExtent)
        .range([scatterHeight, 0]);

    //Dessin de la base pour le nuage de points
    const scatterSvg =
        d3.select('.scatter-plot-container')
            .append('svg')
            .attr('width', scatterWidth + scatterMargin.left + scatterMargin.right)
            .attr('height', scatterHeight + scatterMargin.top + scatterMargin.bottom)
            .append('g')
            .attr('transform', `translate(${scatterMargin.left}, ${scatterMargin.top})`);

    //Dessin nuage de points
    scatterSvg
        .append('g')
        .attr('class', 'scatter-points')
        .selectAll('.scatter')
        .data(scatterData)
        .enter()
        .append('circle')
        .attr('class', 'scatter')
        .attr('cx', d => scatterXScale(d.budget))
        .attr('cy', d => scatterYScale(d.revenue))
        .attr('r', 3)
        .style('fill', 'dodgerblue')
        .style('fill-opacity', 0.7);


    // Dessin header.
    const header = scatterSvg
        .append('g')
        .attr('class', 'scatter-header')
        .attr('transform', `translate(0,${-scatterMargin.top * 0.6})`)
        .append('text');

    header.append('tspan').text('Budget vs. Revenue en $US');

    header
        .append('tspan')
        .attr('x', 0)
        .attr('dy', '1.5em')
        .style('font-size', '0.8em')
        .style('fill', '#555')
        .text('Top 100 des films par budget, 2000-2009');

    // Dessin de l'axe des x nuages de points
    const scatterXAxis = d3
        .axisBottom(scatterXScale)
        .ticks(5)
        .tickFormat(formatTicks)
        .tickSizeInner(-scatterHeight)
        .tickSizeOuter(0);


    function addLabel(axis, label, x) {
        axis
            .selectAll('.tick:last-of-type text')
            .clone()
            .text(label)
            .attr('x', x)
            .style('text-anchor', 'start')
            .style('font-weight', 'bold')
            .style('fill', '#555');
    }

    const scatterXAxisDraw = scatterSvg
        .append('g')
        .attr('class', 'x axis')
        .attr('transform', `translate(0, ${scatterHeight})`)
        .call(scatterXAxis)
        .call(addLabel, 'Budget', 25);

    scatterXAxisDraw.selectAll('text').attr('dy', '1em');



    // Dessin de l'axe des y nuages de points
    const scatterYAxis = d3
        .axisLeft(scatterYScale)
        .ticks(5)
        .tickFormat(formatTicks)
        .tickSizeInner(-scatterHeight)
        .tickSizeOuter(0);

    const scatterYAxisDraw = scatterSvg
        .append('g')
        .attr('class', 'y axis')
        .call(scatterYAxis)
        .call(addLabel, 'Revenue', 5);


    let selectedID;
    // Event handlers for selected elements.
    function mouseover() {
        const selectedID = d3.select(this).data()[0].id;
        d3.selectAll('.scatter')
            .filter(d => d.id === selectedID)
            .transition()
            .attr('r', 6);
    }

    function mouseout() {
        const selectedID = d3.select(this).data()[0].id;
        d3.selectAll('.scatter')
            .filter(d => d.id === selectedID)
            .transition()
            .attr('r', 3);
    }


    // Update selected elements.
    function updateSelected(scatterData) {
        d3.select('.selected-body')
            .selectAll('.selected-element')
            .data(scatterData, d => d.id)
            .join(
                enter =>
                    enter
                        .append('p')
                        .attr('class', 'selected-element')
                        .html(d =>
                            `<span class="selected-title">${d.title}</span>, ${d.release_year
                            } <br>budget: ${formatTicks(d.budget)} | revenue: ${formatTicks(
                                d.revenue
                            )}`),

                update => update,

                exit => exit.remove()
            )

            .on('mouseover', mouseover)
            .on('mouseout', mouseout);
    }

    // Highlight selected circles.
    function highlightSelected(scatterData) {
        const selectedIDs = scatterData.map(d => d.id);
        d3.selectAll('.scatter')
            .filter(d => selectedIDs.includes(d.id))
            .style('fill', 'coral');

        d3.selectAll('.scatter')
            .filter(d => !selectedIDs.includes(d.id))
            .style('fill', 'dodgerblue');
    }

    // Brush handler.
    function brushed(event) {
        if (event.selection) {
            const [[x0, y0], [x1, y1]] = event.selection;
            const selected = scatterData.filter(
                d =>
                    x0 <= scatterXScale(d.budget) &&
                    x1 > scatterXScale(d.budget) &&
                    y0 <= scatterYScale(d.revenue) &&
                    y1 > scatterYScale(d.revenue)
            ); updateSelected(selected);
            highlightSelected(selected);
        } else {
            updateSelected([]);
            highlightSelected([]);
        }
    }




    // Prepare selected elements' container.
    d3.select('.selected-container')
        .style('width', `${scatterWidth + scatterMargin.left + scatterMargin.right}px`)
        .style('height', `${scatterHeight + scatterMargin.top + scatterMargin.bottom}px`);


    // Add brush.
    const brush = d3.brush()
        .on('brush end', brushed);
    scatterSvg
        .append('g')
        .attr('class', 'brush')
        .call(brush);

}

// Fonction de dessin du graphique à lignes
function drawLineChart(lineChartData) {

    // Dimensions : convention des marges pour le graphique à lignes
    const lineMargin = { top: 80, right: 60, bottom: 40, left: 60 };
    const lineWidth = 500 - lineMargin.right - lineMargin.left;
    const lineHeight = 500 - lineMargin.top - lineMargin.bottom;

    // Échelles
    const lineXScale = d3
        .scaleTime()
        .domain(d3.extent(lineChartData.dates))
        .range([0, lineWidth]);

    const lineYScale = d3
        .scaleLinear()
        .domain([0, lineChartData.yMax])
        .range([lineHeight, 0]);

    // Générateur de lignes
    const lineGen = d3
        .line()
        .x(d => lineXScale(d.date))
        .y(d => lineYScale(d.value));


    // Dessin de la base pour le graphique à lignes

    const lineSvg = d3
        .select('.line-chart-container')
        .append('svg')
        .attr('width', lineWidth + lineMargin.left + lineMargin.right)
        .attr('height', lineHeight + lineMargin.top + lineMargin.bottom)
        .append('g')
        .attr('transform', `translate(${lineMargin.left}, ${lineMargin.top})`);


    //Dessin graph de lignes

    // Dessin de l'axe des x du graphique à lignes
    const lineXAxis = d3.axisBottom(lineXScale).tickSizeOuter(0);

    const lineXAxisDraw = lineSvg
        .append('g')
        .attr('transform', `translate(0, ${lineHeight})`)
        .attr('class', 'x axis')
        .call(lineXAxis);


    // Dessin de l'axe des y du graphique à lignes
    const lineYAxis = d3
        .axisLeft(lineYScale)
        .ticks(5)
        .tickFormat(formatTicks)
        .tickSizeOuter(0)
        .tickSizeInner(-lineWidth);

    const lineYAxisDraw = lineSvg
        .append('g')
        .attr('class', 'y axis')
        .call(lineYAxis);

    // Groupe des éléments du graphique
    const chartGroup = lineSvg.append('g').attr('class', 'line-chart');

    //Dessin des lignes
    chartGroup
        .selectAll('.line-series')
        .data(lineChartData.series)
        .enter()
        .append('path')
        .attr('class', d => `line-series ${d.name.toLowerCase()}`)
        .attr('d', d => lineGen(d.values))
        .style('fill', 'none')
        .style('stroke', d => d.color);

    // Ajout des étiquettes 
    chartGroup
        .append('g')
        .attr('class', 'series-labels')
        .selectAll('.series-label')
        .data(lineChartData.series)
        .enter()
        .append('text')
        .attr('x', d => lineXScale(d.values[d.values.length - 1].date) + 5)
        .attr('y', d => lineYScale(d.values[d.values.length - 1].value))
        .text(d => d.name)
        .style('dominant-baseline', 'central')
        .style('font-size', '0.7em')
        .style('font-weight', 'bold')
        .style('fill', d => d.color);

    // Dessin header.
    const header = lineSvg
        .append('g')
        .attr('class', 'line-chart-header')
        .attr('transform', `translate(0,${-lineMargin.top * 0.6})`)
        .append('text');

    header.append('tspan').text('Budget et Revenue a travers le temps $US');

    header
        .append('tspan')
        .attr('x', 0)
        .attr('dy', '1.5em')
        .style('font-size', '0.8em')
        .style('fill', '#555')
        .text('Films avec budget et revenue , 2000-2009');
}

//Tronquage de chaînes de caractères trop longues.
function cutText(string) {
    return string.length < 35 ? string : string.substring(0, 35) + '...';
}

let metric = 'revenue';

// Fonction déclenchée lorsque la souris survole une barre du graphique.
function mouseover() {

    // Récupérer les données associées à la barre survolée.
    const barData = d3.select(this).data()[0];

    // Préparation des données à afficher dans l'infobulle.
    const bodyData = [
        ['Budget', formatTicks(barData.budget)],
        ['Revenue', formatTicks(barData.revenue)],
        ['Profit', formatTicks(barData.revenue - barData.budget)],
        ['TMDb Popularity', Math.round(barData.popularity)],
        ['IMDb Rating', barData.vote_average],
        ['Genres', barData.genres.join(', ')],
    ];

    // Sélection de l'infobulle dans le DOM.
    const tip = d3.select('.tooltip');

    // Positionnement et affichage de l'infobulle.
    tip
        .style('left', `${event.clientX + 15}px`)
        .style('top', `${event.clientY}px`)
        .transition()
        .style('opacity', 0.98);

    // Mise à jour des informations dans l'infobulle.
    tip.select('h3').html(`${barData.title}, ${barData.release_year}`);
    tip.select('h4').html(`${barData.tagline}, ${barData.runtime} min.`);

    // Mise à jour des informations supplémentaires dans l'infobulle.
    d3.select('.tip-body')
        .selectAll('p')
        .data(bodyData)
        .join('p')
        .attr('class', 'tip-info')
        .html(d => `${d[0]}: ${d[1]}`);
}

// Fonction déclenchée lorsque la souris se déplace sur une barre du graphique.
function mousemove() {
    // Mettre à jour la position de l'infobulle pour qu'elle suive la souris.
    d3.select('.tooltip')
        .style('left', `${event.clientX + 15}px`)
        .style('top', `${event.clientY}px`);
}

// Fonction déclenchée lorsque la souris quitte une barre du graphique.
function mouseout() {
    // Masquer l'infobulle en réduisant progressivement son opacité à 0.
    d3.select('.tooltip')
        .transition()
        .style('opacity', 0);
}

//Fonction initialisation
function init(moviesClean) {

    //Configuration des éléments du graphique (svg, axes, barres, titre...)
    // Convention de marge.
    const margin = { top: 80, right: 40, bottom: 40, left: 200 };
    const width = 600 - margin.right - margin.left;
    const height = 500 - margin.top - margin.bottom;

    // Échelles.
    const xScale = d3.scaleLinear().range([0, width]);

    const yScale = d3
        .scaleBand()
        .rangeRound([0, height])
        .paddingInner(0.25);

    // Dessiner la base.
    const svg = d3
        .select('.bar-chart-container')
        .append('svg')
        .attr('width', width + margin.right + margin.left)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Dessiner header.
    const header = svg
        .append('g')
        .attr('class', 'bar-header')
        .attr('transform', `translate(0,${-margin.top * 0.6})`)
        .append('text');

    const headline = header.append('tspan');

    header
        .append('tspan')
        .attr('x', 0)
        .attr('dy', '1.5em')
        .style('font-size', '0.8em')
        .style('fill', '#555')
        .text('Top 15 films, 2000-2009');

    // Dessiner les barres.
    const bars = svg.append('g').attr('class', 'bars');

    // Dessiner l'axe des abscisses.
    const xAxis = d3
        .axisTop(xScale)
        .ticks(5)
        .tickFormat(formatTicks)
        .tickSizeInner(-height)
        .tickSizeOuter(0);

    const xAxisDraw = svg.append('g').attr('class', 'x axis');

    // Dessiner l'axe des ordonnées.
    const yAxis = d3.axisLeft(yScale).tickSize(0);

    const yAxisDraw = svg.append('g').attr('class', 'y axis');

    // Écouter les événements de clic.
    d3.selectAll('button').on('click', click);

    // Gestionnaire de clic.
    function click() {
        metric = this.dataset.name;

        const updatedData = moviesClean
            .sort((a, b) => b[metric] - a[metric])
            .filter((d, i) => i < 15);

        update(updatedData);
    }
    // Modèle de mise à jour 
    function update(data) {

        // Mettre à jour les échelles.
        xScale.domain([0, d3.max(data, d => d[metric])]);
        yScale.domain(data.map(d => cutText(d.title)));

        // Configurer la transition.
        const dur = 1000;
        const t = d3.transition().duration(dur);

        // Mettre à jour les barres.
        bars
            .selectAll('.bar')
            .data(data, d => d.title)
            .join(
                enter => {
                    enter
                        .append('rect')
                        .attr('class', 'bar')
                        .attr('y', d => yScale(cutText(d.title)))
                        .attr('height', yScale.bandwidth())
                        .style('fill', 'lightcyan')
                        .transition(t)
                        .delay((d, i) => i * 20)
                        .attr('width', d => xScale(d[metric]))
                        .style('fill', 'dodgerblue')
                },

                update => {
                    update
                        .transition(t)
                        .delay((d, i) => i * 20)
                        .attr('y', d => yScale(cutText(d.title)))
                        .attr('width', d => xScale(d[metric]));
                },

                exit => {
                    exit
                        .transition()
                        .duration(dur / 2)
                        .style('fill-opacity', 0)
                        .remove();
                }
            );

        // Mettre à jour les axes.
        xAxisDraw.transition(t).call(xAxis.scale(xScale));
        yAxisDraw.transition(t).call(yAxis.scale(yScale));

        yAxisDraw.selectAll('text').attr('dx', '-0.6em');

        // Mettre à jour le header.
        headline.text(
            `Total ${metric} par titre ${metric === 'popularite' ? '' : 'en $US'}`
        );

        //Add tooltip
        d3.selectAll('.bar')
            .on('mouseover', mouseover)
            .on('mousemove', mousemove)
            .on('mouseout', mouseout);
    }

    // barres initiales
    const revenueData = moviesClean
        .sort((a, b) => b.revenue - a.revenue)
        .filter((d, i) => i < 15);


    update(revenueData);






}


// Fonction principale
// Préparation des données et dessin du diagramme à barres
function ready(movies) {




    // Filtrage des données des films
    const moviesClean = filterData(movies);


    // Initialisation des éléments du graphique et écouteurs d'événements.
    init(moviesClean);

    // Préparation des données pour le nuage de points
    const scatterData = prepareScatterData(moviesClean);

    // Préparation des données pour la charte de lignes
    const lineChartData = prepareLineChartData(moviesClean);


    // Appelle drawScatterChart
    drawScatterChart(scatterData);

    // Appelle drawScatterChart
    drawLineChart(lineChartData);


}

// Chargement des données
d3.csv('data/movies.csv', type).then(res => {
    ready(res);
});


