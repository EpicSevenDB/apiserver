(function() {
	//* ------------------------
	// Section: All code examples with Tabs
	// .tabs followed by .codetabs
	// each .tabs li a must have a data-results
	// each div inside .codetabs must have a data-code with same value of data-results of it's tab
	//------------------------ */
	const tabs = document.querySelectorAll('.tabs');
	if (tabs.length) {
		tabs.forEach((tabList) => {
			let codeTabs = false;
			if (tabList.nextElementSibling.classList.contains('codetabs')) {
				codeTabs = tabList.nextElementSibling;
			}

			//no codetabs for that set of tabs
			if (!codeTabs) {
				return;
			}

			tabList.querySelectorAll('li').forEach((tabLi) => {
				tabLi.addEventListener(
					'click',
					function(ev) {
						ev.preventDefault();
						ev.stopPropagation();

						const { results } = this.querySelector('a').dataset;
						let codeblock;

						if (results) {
							codeblock = codeTabs.querySelector(`div[data-code="${results}"]`);
							if (codeblock) {
								tabList.querySelectorAll('li').forEach((li) => li.classList.remove('is-active'));
								tabLi.classList.add('is-active');

								codeTabs
									.querySelectorAll('div[data-code]')
									.forEach((div) => div.classList.add('is-hidden'));
								codeblock.classList.remove('is-hidden');
							}
						}
					}.bind(tabLi)
				);
			});
		});
	}
})();
