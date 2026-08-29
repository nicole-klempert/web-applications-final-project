document.addEventListener('DOMContentLoaded',async()=>{
    const currentUser=(localStorage.getItem('loggedInUser')||'').trim();
    if(!currentUser){window.location.replace('login.html');return;}
    const mapElement=document.getElementById('posts-map'),list=document.getElementById('map-posts-list'),title=document.getElementById('map-posts-title'),description=document.getElementById('map-description');
    const params=new URLSearchParams(window.location.search),postId=params.get('postId'),radius=params.get('radius')||500;
    try{
        await window.PostLocationPicker.loadGoogleMaps();
        const query=new URLSearchParams();
        if(postId)query.set('postId',postId);
        query.set('radius',radius);
        const response=await fetch(`/posts/map?${query}`,{headers:{Accept:'application/json'}}),data=await response.json();
        if(!response.ok||!data.success)throw new Error(data.error||'Could not load map posts');
        const center=data.center||{latitude:31.7683,longitude:35.2137};
        const map=new google.maps.Map(mapElement,{center:{lat:center.latitude,lng:center.longitude},zoom:postId?16:7,mapTypeControl:false,streetViewControl:false});
        const infoWindow=new google.maps.InfoWindow(),bounds=new google.maps.LatLngBounds();
        (data.posts||[]).forEach(post=>{
            const position={lat:post.location.latitude,lng:post.location.longitude};
            const marker=new google.maps.Marker({position,map,title:post.location.name||post.location.address||'Post location'});
            bounds.extend(position);
            marker.addListener('click',()=>infoWindow.open({anchor:marker,map,content:`<div><strong>${post.author}</strong><p>${post.content||'Post with media'}</p><small>${post.location.address||post.location.name||''}</small>${post.group?.name?`<p>Group: ${post.group.name}</p>`:''}</div>`}));
        });
        if(!postId&&data.posts?.length)map.fitBounds(bounds);
        if(postId){title.textContent=`Posts within ${Number(radius)} m`;description.textContent='Posts near the selected post location that you are allowed to view.';}
        if(!data.posts?.length){list.innerHTML='<div class="map-empty">No posts with location were found.</div>';return;}
        list.innerHTML=data.posts.map(post=>`<article class="map-post-item"><a href="feed.html?postId=${encodeURIComponent(post._id)}"><strong>${post.author}</strong></a>${post.group?.name?` <small>in <a href="group.html?id=${post.group._id}">${post.group.name}</a></small>`:''}<div>${post.content||'Post with media'}</div><div class="map-post-location"><i class="bi bi-geo-alt"></i> ${post.location.address||post.location.name||''}</div></article>`).join('');
    }catch(error){mapElement.innerHTML=`<div class="map-empty">${error.message}</div>`;list.innerHTML='<div class="map-empty">Map data could not be loaded.</div>';}
});
