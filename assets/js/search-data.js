// get the ninja-keys element
const ninja = document.querySelector('ninja-keys');

// add the home and posts menu items
ninja.data = [{
    id: "nav-about",
    title: "about",
    section: "Navigation",
    handler: () => {
      window.location.href = "/";
    },
  },{id: "nav-blog",
          title: "blog",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/blog/";
          },
        },{id: "nav-projects",
          title: "projects",
          description: "Projects I have worked on.",
          section: "Navigation",
          handler: () => {
            window.location.href = "/projects/";
          },
        },{id: "post-reflections-on-vapor-building-a-3d-smoke-simulator",
        
          title: "Reflections on Vapor (Building a 3D Smoke Simulator)",
        
        description: "What I learned building a real-time 3D fluid simulation with GPU acceleration from scratch.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2026/vapor/";
          
        },
      },{id: "post-reflections-on-turing-complete-building-a-cpu-from-scratch",
        
          title: "Reflections on Turing Complete (Building a CPU from Scratch)",
        
        description: "How building a virtual CPU changed my perspective on computer architecture, control flow, and hardware design.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2026/turing-complete/";
          
        },
      },{id: "post-file-compression-using-huffman-coding",
        
          title: "File Compression Using Huffman Coding",
        
        description: "Huffman encoder/decoder from scratch",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2026/huffman-coding/";
          
        },
      },{id: "books-the-godfather",
              title: 'The Godfather',
              description: "",
              section: "Books",handler: () => {
                  window.location.href = "/books/the_godfather/";
                },},{id: "projects-vapor",
              title: 'Vapor',
              description: "Interactive real-time 3D smoke plume simulation with GPU-accelerated fluid solver and volume ray-marching",
              section: "Projects",handler: () => {
                  window.location.href = "/projects/10_project/";
                },},{id: "teachings-data-science-fundamentals",
              title: 'Data Science Fundamentals',
              description: "This course covers the foundational aspects of data science, including data collection, cleaning, analysis, and visualization. Students will learn practical skills for working with real-world datasets.",
              section: "Teachings",handler: () => {
                  window.location.href = "/teachings/data-science-fundamentals/";
                },},{id: "teachings-introduction-to-machine-learning",
              title: 'Introduction to Machine Learning',
              description: "This course provides an introduction to machine learning concepts, algorithms, and applications. Students will learn about supervised and unsupervised learning, model evaluation, and practical implementations.",
              section: "Teachings",handler: () => {
                  window.location.href = "/teachings/introduction-to-machine-learning/";
                },},{
      id: 'light-theme',
      title: 'Change theme to light',
      description: 'Change the theme of the site to Light',
      section: 'Theme',
      handler: () => {
        setThemeSetting("light");
      },
    },
    {
      id: 'dark-theme',
      title: 'Change theme to dark',
      description: 'Change the theme of the site to Dark',
      section: 'Theme',
      handler: () => {
        setThemeSetting("dark");
      },
    },
    {
      id: 'system-theme',
      title: 'Use system default theme',
      description: 'Change the theme of the site to System Default',
      section: 'Theme',
      handler: () => {
        setThemeSetting("system");
      },
    },];
