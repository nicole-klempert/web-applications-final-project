(() => {
    let googleMapsPromise=null;
    const loadGoogleMaps=()=>{
        if(window.google?.maps)return Promise.resolve(window.google.maps);
        if(googleMapsPromise)return googleMapsPromise;
        googleMapsPromise=fetch('/map/config',{headers:{Accept:'application/json'}}).then(async response=>{
            const data=await response.json();
            if(!response.ok||!data.success)throw new Error(data.error||'Could not load Google Maps');
            return new Promise((resolve,reject)=>{
                const script=document.createElement('script');
                script.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(data.apiKey)}&v=weekly`;
                script.async=true;
                script.onload=()=>resolve(window.google.maps);
                script.onerror=()=>reject(new Error('Could not load Google Maps'));
                document.head.appendChild(script);
            });
        });
        return googleMapsPromise;
    };
    const createPicker=({buttonId,panelId,mapId,searchInputId,searchButtonId,clearButtonId,labelId,onChange})=>{
        const button=document.getElementById(buttonId),panel=document.getElementById(panelId),mapElement=document.getElementById(mapId),searchInput=document.getElementById(searchInputId),searchButton=document.getElementById(searchButtonId),clearButton=document.getElementById(clearButtonId),label=document.getElementById(labelId);
        if(!button||!panel||!mapElement)return null;
        let map=null,marker=null,geocoder=null,selectedLocation=null,loading=false;
        const emit=()=>onChange?.(selectedLocation);
        const showSelected=location=>{
            selectedLocation=location;
            if(label)label.textContent=location?location.address||location.name:'No location selected';
            if(clearButton)clearButton.hidden=!location;
            emit();
        };
        const setMarker=(lat,lng)=>{
            if(marker)marker.setMap(null);
            marker=new google.maps.Marker({position:{lat,lng},map});
            map.panTo({lat,lng});
            map.setZoom(16);
        };
        const useGeocodeResult=(result,typedName='')=>{
            const lat=result.geometry.location.lat(),lng=result.geometry.location.lng();
            setMarker(lat,lng);
            showSelected({name:typedName||result.formatted_address,address:result.formatted_address,latitude:lat,longitude:lng});
        };
        const initialize=async()=>{
            if(map||loading)return;
            loading=true;
            try{
                await loadGoogleMaps();
                geocoder=new google.maps.Geocoder();
                map=new google.maps.Map(mapElement,{center:{lat:31.7683,lng:35.2137},zoom:7,mapTypeControl:false,streetViewControl:false});
                if(selectedLocation&&Number.isFinite(Number(selectedLocation.latitude))&&Number.isFinite(Number(selectedLocation.longitude)))setMarker(Number(selectedLocation.latitude),Number(selectedLocation.longitude));
                map.addListener('click',event=>{
                    geocoder.geocode({location:event.latLng},(results,status)=>{
                        if(status==='OK'&&results?.[0])useGeocodeResult(results[0]);
                        else{
                            const lat=event.latLng.lat(),lng=event.latLng.lng();
                            setMarker(lat,lng);
                            showSelected({name:`${lat.toFixed(5)}, ${lng.toFixed(5)}`,address:`${lat.toFixed(5)}, ${lng.toFixed(5)}`,latitude:lat,longitude:lng});
                        }
                    });
                });
            }catch(error){if(label)label.textContent=error.message;}
            finally{loading=false;}
        };
        button.addEventListener('click',async()=>{
            panel.hidden=!panel.hidden;
            if(!panel.hidden){await initialize();setTimeout(()=>window.google?.maps?.event?.trigger(map,'resize'),0);}
        });
        searchButton?.addEventListener('click',async()=>{
            const address=searchInput?.value.trim();
            if(!address)return;
            await initialize();
            geocoder.geocode({address},(results,status)=>{
                if(status==='OK'&&results?.[0])useGeocodeResult(results[0],address);
                else if(label)label.textContent='Location not found. Try another address.';
            });
        });
        searchInput?.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();searchButton?.click();}});
        clearButton?.addEventListener('click',()=>{
            if(marker){marker.setMap(null);marker=null;}
            if(searchInput)searchInput.value='';
            showSelected(null);
        });
        const setLocation=location=>{
            if(!location){clearButton?.click();return;}
            const latitude=Number(location.latitude),longitude=Number(location.longitude);
            if(!Number.isFinite(latitude)||!Number.isFinite(longitude))return;
            const normalized={name:String(location.name||''),address:String(location.address||''),latitude,longitude};
            if(searchInput)searchInput.value=normalized.address||normalized.name;
            showSelected(normalized);
            if(map)setMarker(latitude,longitude);
        };
        return {getLocation:()=>selectedLocation,clear:()=>clearButton?.click(),setLocation};
    };
    window.PostLocationPicker={loadGoogleMaps,createPicker};
})();
